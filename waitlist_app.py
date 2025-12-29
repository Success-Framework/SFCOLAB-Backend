import os
from flask import Flask, jsonify, request
from flask_cors import CORS
from extensions import db
from datetime import datetime

app = Flask(__name__)

# CORS - Allow frontend domains
CORS(app, origins=[
    "http://localhost:5173",
    "http://localhost:3000",
    "http://127.0.0.1:5000",
    "https://sfcollab.com",
    "https://www.sfcollab.com"
])

# Database Configuration
app.config["SQLALCHEMY_DATABASE_URI"] = os.environ.get(
    "DATABASE_URL",
    "sqlite:///sf_waitlist.db"
)
app.config["SQLALCHEMY_TRACK_MODIFICATIONS"] = False

db.init_app(app)

# Import models
from Waitlist import Waitlist
from Contribution import Contribution


# ========================================
# HOME ROUTE
# ========================================

@app.route('/')
def home():
    return jsonify({
        "message": "SF Waitlist & Rank System API",
        "version": "2.0",
        "access_waves": {
            "wave1": "January 10 - 1,000 users",
            "wave2": "January 17 - 2,500 users",
            "wave3": "January 24 - 5,000 users",
            "wave4": "January 31 - 7,500 users",
            "wave5": "February 7 - 10,000 users"
        },
        "free_access": "Everyone gets free access until February 7, 2025"
    }), 200


# ========================================
# WAITLIST ENDPOINTS
# ========================================

@app.route('/api/waitlist/signup', methods=['POST'])
def waitlist_signup():
    """
    Join the SF waitlist
    
    Body: {
        "email": "user@example.com",
        "name": "John Doe",
        "referred_by": "ABC123" (optional)
    }
    """
    data = request.get_json()
    
    if not data:
        return jsonify({"error": "No data provided"}), 400
    
    email = data.get('email')
    name = data.get('name')
    referred_by = data.get('referred_by')
    
    if not email:
        return jsonify({"error": "Email is required"}), 400
    
    success, message, result = Waitlist.signup(
        email=email,
        name=name,
        referred_by=referred_by
    )
    
    if success:
        return jsonify({"message": message, "data": result}), 201
    else:
        return jsonify({"message": message, "data": result}), 200


@app.route('/api/waitlist/position/<email>', methods=['GET'])
def get_position(email):
    """Get user's position (frontend expects this route)"""
    user = Waitlist.query.filter_by(email=email).first()
    
    if not user:
        return jsonify({"error": "User not found"}), 404
    
    return jsonify({
        "email": user.email,
        "name": user.name,
        "position": user.get_current_rank(),
        "referral_code": user.referral_code,
        "total_score": user.total_rank_score,
        "access_wave": user.get_access_wave(),
        "free_access_until": "February 7, 2025"
    }), 200


@app.route('/api/waitlist/user/<email>', methods=['GET'])
def get_user_status(email):
    """Get user's full waitlist status"""
    user = Waitlist.query.filter_by(email=email).first()
    
    if not user:
        return jsonify({"error": "User not found"}), 404
    
    return jsonify({
        "email": user.email,
        "name": user.name,
        "referral_code": user.referral_code,
        "current_rank": user.get_current_rank(),
        "snapshot_rank": user.snapshot_rank,
        "access_wave": user.get_access_wave(),
        "score_breakdown": {
            "referrals": user.referral_count,
            "referral_points": user.referral_count * 2,
            "contribution_points": user.contribution_points,
            "engagement_points": user.engagement_points,
            "early_bonus": user.early_commitment_bonus,
            "code_development_points": user.code_development_points,
            "total_score": user.total_rank_score
        },
        "rewards": {
            "free_access_months": user.free_access_months,
            "discount_percentage": user.discount_percentage,
            "voting_weight": user.voting_weight
        },
        "badges": user.get_badges_list(),
        "status": user.status,
        "is_verified": user.is_verified,
        "created_at": user.created_at.isoformat() if user.created_at else None
    }), 200


@app.route('/api/waitlist/leaderboard', methods=['GET'])
def get_leaderboard():
    """Get top 20 users"""
    limit = request.args.get('limit', 20, type=int)
    if limit > 20:
        limit = 20
    
    leaderboard = Waitlist.get_leaderboard(limit=limit)
    return jsonify({"leaderboard": leaderboard}), 200


@app.route('/api/waitlist/stats', methods=['GET'])
def get_stats():
    """Get waitlist statistics"""
    stats = Waitlist.get_stats()
    return jsonify(stats), 200


@app.route('/api/waitlist/all', methods=['GET'])
def get_all_waitlist():
    """Get all waitlist users (frontend expects this)"""
    users = Waitlist.query.filter_by(is_spam=False).order_by(
        Waitlist.total_rank_score.desc()
    ).all()
    
    result = []
    for i, user in enumerate(users, 1):
        result.append({
            "rank": i,
            "email": user.email,
            "name": user.name,
            "total_score": user.total_rank_score,
            "referral_code": user.referral_code,
            "access_wave": user.get_access_wave()
        })
    
    return jsonify({
        "total": len(result),
        "users": result
    }), 200


@app.route('/api/waitlist/validate/<referral_code>', methods=['GET'])
def validate_referral(referral_code):
    """Check if referral code is valid"""
    user = Waitlist.query.filter_by(referral_code=referral_code, is_spam=False).first()
    
    if not user:
        return jsonify({"valid": False, "message": "Invalid referral code"}), 404
    
    return jsonify({
        "valid": True,
        "referrer_name": user.name or "Anonymous",
        "message": "Valid referral code"
    }), 200


@app.route('/api/waitlist/access-waves', methods=['GET'])
def get_access_waves():
    """Get all access wave dates"""
    return jsonify({
        "access_waves": [
            {"wave": "wave1", "date": "January 10, 2025", "target": 1000},
            {"wave": "wave2", "date": "January 17, 2025", "target": 2500},
            {"wave": "wave3", "date": "January 24, 2025", "target": 5000},
            {"wave": "wave4", "date": "January 31, 2025", "target": 7500},
            {"wave": "wave5", "date": "February 7, 2025", "target": 10000}
        ],
        "free_access_period": {
            "start": "Now",
            "end": "February 7, 2025",
            "note": "Everyone on the waitlist gets free access until February 7th"
        }
    }), 200


# ========================================
# REFERRAL ENDPOINTS (Frontend expects these)
# ========================================

@app.route('/api/referral/register', methods=['POST'])
def referral_register():
    """Register user as referrer"""
    data = request.get_json()
    
    if not data:
        return jsonify({"error": "No data provided"}), 400
    
    email = data.get('email')
    name = data.get('name')
    
    if not email:
        return jsonify({"error": "Email is required"}), 400
    
    # Check if already on waitlist
    user = Waitlist.query.filter_by(email=email).first()
    
    if user:
        return jsonify({
            "message": "Already registered",
            "referral_code": user.referral_code,
            "total_referrals": user.referral_count
        }), 200
    
    # Create new user
    success, message, result = Waitlist.signup(email=email, name=name)
    
    return jsonify({
        "message": message,
        "referral_code": result.get("referral_code"),
        "total_referrals": 0
    }), 201


@app.route('/api/referral/invite', methods=['POST'])
def referral_invite():
    """Invite someone using referral"""
    data = request.get_json()
    
    if not data:
        return jsonify({"error": "No data provided"}), 400
    
    referrer_email = data.get('referrer_email')
    contact_email = data.get('contact_email')
    contact_name = data.get('contact_name')
    
    if not referrer_email or not contact_email:
        return jsonify({"error": "referrer_email and contact_email required"}), 400
    
    # Find referrer
    referrer = Waitlist.query.filter_by(email=referrer_email).first()
    if not referrer:
        return jsonify({"error": "Referrer not found"}), 404
    
    # Check if contact already exists
    existing = Waitlist.query.filter_by(email=contact_email).first()
    if existing:
        return jsonify({"error": "Contact already on waitlist"}), 400
    
    # Create new user with referral
    success, message, result = Waitlist.signup(
        email=contact_email,
        name=contact_name,
        referred_by=referrer.referral_code
    )
    
    if success:
        return jsonify({
            "message": f"Invited {contact_email}. You earned +2 points!",
            "referrer_new_score": referrer.total_rank_score,
            "referrer_total_referrals": referrer.referral_count
        }), 201
    else:
        return jsonify({"error": message}), 400


@app.route('/api/referral/user/<email>', methods=['GET'])
def get_user_referrals(email):
    """Get user's referral info"""
    user = Waitlist.query.filter_by(email=email).first()
    
    if not user:
        return jsonify({"error": "User not found"}), 404
    
    # Find users referred by this person
    referred_users = Waitlist.query.filter_by(referred_by=user.referral_code).all()
    
    referrals = []
    for r in referred_users:
        referrals.append({
            "email": r.email,
            "name": r.name,
            "joined_at": r.created_at.isoformat() if r.created_at else None
        })
    
    return jsonify({
        "email": user.email,
        "name": user.name,
        "referral_code": user.referral_code,
        "total_referrals": user.referral_count,
        "referral_points": user.referral_count * 2,
        "referrals": referrals
    }), 200


@app.route('/api/referral/claim', methods=['POST'])
def claim_referral_reward():
    """Claim referral rewards"""
    data = request.get_json()
    
    if not data:
        return jsonify({"error": "No data provided"}), 400
    
    email = data.get('email')
    
    if not email:
        return jsonify({"error": "Email is required"}), 400
    
    user = Waitlist.query.filter_by(email=email).first()
    if not user:
        return jsonify({"error": "User not found"}), 404
    
    return jsonify({
        "message": "Rewards are automatically applied based on your rank",
        "current_rank": user.get_current_rank(),
        "free_access_months": user.free_access_months,
        "discount_percentage": user.discount_percentage
    }), 200


@app.route('/api/referral/stats', methods=['GET'])
def get_referral_stats():
    """Get referral statistics"""
    total_users = Waitlist.query.filter_by(is_spam=False).count()
    total_referrals = db.session.query(db.func.sum(Waitlist.referral_count)).scalar() or 0
    
    top_referrers = Waitlist.query.filter_by(is_spam=False).order_by(
        Waitlist.referral_count.desc()
    ).limit(10).all()
    
    top_list = []
    for user in top_referrers:
        if user.referral_count > 0:
            top_list.append({
                "name": user.name or "Anonymous",
                "referrals": user.referral_count,
                "points": user.referral_count * 2
            })
    
    return jsonify({
        "total_users": total_users,
        "total_referrals": total_referrals,
        "top_referrers": top_list
    }), 200


# ========================================
# CONTRIBUTION ENDPOINTS
# ========================================

@app.route('/api/contribution/submit', methods=['POST'])
def submit_contribution():
    """Submit a contribution for review"""
    data = request.get_json()
    
    if not data:
        return jsonify({"error": "No data provided"}), 400
    
    email = data.get('email')
    contribution_type = data.get('contribution_type')
    description = data.get('description', '')
    points = data.get('points', 5)
    
    if not email:
        return jsonify({"error": "Email is required"}), 400
    if not contribution_type:
        return jsonify({"error": "contribution_type is required"}), 400
    
    user = Waitlist.query.filter_by(email=email).first()
    if not user:
        return jsonify({"error": "User not on waitlist"}), 404
    
    success, message, result = Contribution.submit_contribution(
        waitlist_id=user.id,
        contribution_type=contribution_type,
        description=description,
        points=points
    )
    
    if success:
        return jsonify({"message": message, "data": result}), 201
    else:
        return jsonify({"error": message}), 400


@app.route('/api/contribution/user/<email>', methods=['GET'])
def get_user_contributions(email):
    """Get all contributions for a user"""
    user = Waitlist.query.filter_by(email=email).first()
    if not user:
        return jsonify({"error": "User not found"}), 404
    
    contributions = Contribution.get_user_contributions(user.id)
    return jsonify({
        "email": email,
        "total_contribution_points": user.contribution_points,
        "contributions": contributions
    }), 200


@app.route('/api/contribution/types', methods=['GET'])
def get_contribution_types():
    """Get all valid contribution types"""
    return jsonify({"types": Contribution.CONTRIBUTION_TYPES}), 200


# ========================================
# ENGAGEMENT ENDPOINTS
# ========================================

@app.route('/api/engagement/add', methods=['POST'])
def add_engagement():
    """Add engagement points"""
    data = request.get_json()
    
    if not data:
        return jsonify({"error": "No data provided"}), 400
    
    email = data.get('email')
    points = data.get('points', 1)
    activity = data.get('activity', 'general')
    
    if not email:
        return jsonify({"error": "Email is required"}), 400
    
    user = Waitlist.query.filter_by(email=email).first()
    if not user:
        return jsonify({"error": "User not found"}), 404
    
    user.add_engagement(points)
    db.session.commit()
    
    return jsonify({
        "message": f"Added {points} engagement points for {activity}",
        "total_engagement_points": user.engagement_points,
        "new_total_score": user.total_rank_score,
        "new_rank": user.get_current_rank()
    }), 200


# ========================================
# CODE DEVELOPMENT ENDPOINTS
# ========================================

@app.route('/api/code-development/add', methods=['POST'])
def add_code_development():
    """Add code development points (admin only)"""
    data = request.get_json()
    
    if not data:
        return jsonify({"error": "No data provided"}), 400
    
    email = data.get('email')
    points = data.get('points')
    description = data.get('description', '')
    
    if not email:
        return jsonify({"error": "Email is required"}), 400
    if not points or points <= 0:
        return jsonify({"error": "Points must be positive"}), 400
    
    user = Waitlist.query.filter_by(email=email).first()
    if not user:
        return jsonify({"error": "User not found"}), 404
    
    success, message = user.add_code_development_points(points, description)
    db.session.commit()
    
    if success:
        return jsonify({
            "message": message,
            "total_code_development_points": user.code_development_points,
            "new_total_score": user.total_rank_score,
            "new_rank": user.get_current_rank()
        }), 200
    else:
        return jsonify({"error": message}), 400


# ========================================
# ADMIN ENDPOINTS
# ========================================

@app.route('/api/admin/contributions/pending', methods=['GET'])
def get_pending_contributions():
    """Admin: Get pending contributions"""
    pending = Contribution.get_pending_contributions()
    return jsonify({
        "count": len(pending),
        "contributions": pending
    }), 200


@app.route('/api/admin/contribution/approve/<int:contribution_id>', methods=['POST'])
def approve_contribution(contribution_id):
    """Admin: Approve a contribution"""
    data = request.get_json() or {}
    reviewer = data.get('reviewer', 'admin')
    
    success, message = Contribution.approve_contribution(contribution_id, reviewer)
    
    if success:
        return jsonify({"message": message}), 200
    else:
        return jsonify({"error": message}), 400


@app.route('/api/admin/contribution/reject/<int:contribution_id>', methods=['POST'])
def reject_contribution(contribution_id):
    """Admin: Reject a contribution"""
    data = request.get_json() or {}
    reviewer = data.get('reviewer', 'admin')
    
    success, message = Contribution.reject_contribution(contribution_id, reviewer)
    
    if success:
        return jsonify({"message": message}), 200
    else:
        return jsonify({"error": message}), 400


@app.route('/api/admin/verify/<email>', methods=['POST'])
def verify_user(email):
    """Admin: Verify a user"""
    user = Waitlist.query.filter_by(email=email).first()
    if not user:
        return jsonify({"error": "User not found"}), 404
    
    user.is_verified = True
    db.session.commit()
    
    return jsonify({"message": f"User {email} verified"}), 200


@app.route('/api/admin/mark-spam/<email>', methods=['POST'])
def mark_spam(email):
    """Admin: Mark user as spam"""
    user = Waitlist.query.filter_by(email=email).first()
    if not user:
        return jsonify({"error": "User not found"}), 404
    
    user.is_spam = True
    db.session.commit()
    
    return jsonify({"message": f"User {email} marked as spam"}), 200


@app.route('/api/admin/snapshot', methods=['POST'])
def take_snapshot():
    """Admin: Take global snapshot"""
    count = Waitlist.take_global_snapshot()
    return jsonify({
        "message": f"Snapshot taken for {count} users",
        "timestamp": datetime.now().isoformat()
    }), 200


@app.route('/api/admin/all-users', methods=['GET'])
def get_all_users():
    """Admin: Get all users"""
    users = Waitlist.query.filter_by(is_spam=False).order_by(
        Waitlist.total_rank_score.desc()
    ).all()
    
    result = []
    for i, user in enumerate(users, 1):
        result.append({
            "rank": i,
            "email": user.email,
            "name": user.name,
            "total_score": user.total_rank_score,
            "referrals": user.referral_count,
            "contributions": user.contribution_points,
            "engagement": user.engagement_points,
            "early_bonus": user.early_commitment_bonus,
            "code_development": user.code_development_points,
            "access_wave": user.get_access_wave(),
            "status": user.status,
            "is_verified": user.is_verified,
            "badges": user.get_badges_list(),
            "snapshot_rank": user.snapshot_rank
        })
    
    return jsonify({
        "total": len(result),
        "users": result
    }), 200


@app.route('/api/admin/wave-users/<wave>', methods=['GET'])
def get_wave_users(wave):
    """Admin: Get users in specific wave"""
    valid_waves = ["wave1", "wave2", "wave3", "wave4", "wave5"]
    if wave not in valid_waves:
        return jsonify({"error": f"Invalid wave. Use: {valid_waves}"}), 400
    
    users = Waitlist.query.filter_by(is_spam=False).order_by(
        Waitlist.total_rank_score.desc()
    ).all()
    
    wave_users = [u for u in users if u.get_access_wave() == wave]
    
    result = []
    for user in wave_users:
        result.append({
            "email": user.email,
            "name": user.name,
            "rank": user.get_current_rank(),
            "total_score": user.total_rank_score
        })
    
    return jsonify({
        "wave": wave,
        "count": len(result),
        "users": result
    }), 200


# ========================================
# RUN APP
# ========================================

if __name__ == '__main__':
    with app.app_context():
        db.create_all()
        print("=" * 60)
        print("SF WAITLIST & RANK SYSTEM v2.0")
        print("=" * 60)
        print("\nAll routes have /api prefix")
        print("\nFrontend Routes:")
        print("  POST /api/waitlist/signup")
        print("  GET  /api/waitlist/position/<email>")
        print("  GET  /api/waitlist/stats")
        print("  GET  /api/waitlist/all")
        print("  POST /api/referral/register")
        print("  POST /api/referral/invite")
        print("  GET  /api/referral/user/<email>")
        print("  POST /api/referral/claim")
        print("  GET  /api/referral/stats")
        print("=" * 60)
    
    app.run(debug=True)