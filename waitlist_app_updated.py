import os
from flask import Flask, jsonify, request
from flask_cors import CORS
from extensions import db

app = Flask(__name__)
CORS(app)

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
        "version": "1.0",
        "targets": {
            "mvp": "1000 users by Jan 10",
            "v1": "10000 users by Feb"
        }
    }), 200


# ========================================
# WAITLIST ENDPOINTS
# ========================================

@app.route('/waitlist/signup', methods=['POST'])
def waitlist_signup():
    """
    Join the SF waitlist
    
    Body: {
        "email": "user@example.com",
        "name": "John Doe",
        "referred_by": "ABC123" (optional)
    }
    
    Returns rank, referral code, and early bonus points
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


@app.route('/waitlist/user/<email>', methods=['GET'])
def get_user_status(email):
    """Get user's waitlist status, rank, and rewards"""
    user = Waitlist.query.filter_by(email=email).first()
    
    if not user:
        return jsonify({"error": "User not found"}), 404
    
    return jsonify({
        "email": user.email,
        "name": user.name,
        "referral_code": user.referral_code,
        "current_rank": user.get_current_rank(),
        "snapshot_rank": user.snapshot_rank,
        "score_breakdown": {
            "referrals": user.referral_count,
            "referral_points": user.referral_count * 2,
            "contribution_points": user.contribution_points,
            "engagement_points": user.engagement_points,
            "early_bonus": user.early_commitment_bonus,
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


@app.route('/waitlist/leaderboard', methods=['GET'])
def get_leaderboard():
    """Get top 20 users (as per SF documentation)"""
    limit = request.args.get('limit', 20, type=int)
    if limit > 20:
        limit = 20  # Max 20 as per documentation
    
    leaderboard = Waitlist.get_leaderboard(limit=limit)
    return jsonify({"leaderboard": leaderboard}), 200


@app.route('/waitlist/stats', methods=['GET'])
def get_stats():
    """Get waitlist statistics"""
    stats = Waitlist.get_stats()
    return jsonify(stats), 200


@app.route('/waitlist/validate/<referral_code>', methods=['GET'])
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


# ========================================
# CONTRIBUTION ENDPOINTS
# ========================================

@app.route('/contribution/submit', methods=['POST'])
def submit_contribution():
    """
    Submit a contribution for review
    
    Body: {
        "email": "user@example.com",
        "contribution_type": "bug_report",
        "description": "Found issue with...",
        "points": 10
    }
    
    Types: bug_report, feature_feedback, testing, documentation, demo_project, community_support
    Points: 5 (small), 10 (medium), 20 (high-impact)
    """
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
    
    # Find waitlist user
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


@app.route('/contribution/user/<email>', methods=['GET'])
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


@app.route('/contribution/types', methods=['GET'])
def get_contribution_types():
    """Get all valid contribution types and their point ranges"""
    return jsonify({"types": Contribution.CONTRIBUTION_TYPES}), 200


# ========================================
# ENGAGEMENT ENDPOINTS
# ========================================

@app.route('/engagement/add', methods=['POST'])
def add_engagement():
    """
    Add engagement points for user activity
    
    Body: {
        "email": "user@example.com",
        "points": 1,
        "activity": "poll_participation"
    }
    """
    data = request.get_json()
    
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
        "new_total_score": user.total_rank_score
    }), 200


# ========================================
# ADMIN ENDPOINTS
# ========================================

@app.route('/admin/contributions/pending', methods=['GET'])
def get_pending_contributions():
    """Admin: Get all pending contributions for review"""
    pending = Contribution.get_pending_contributions()
    return jsonify({
        "count": len(pending),
        "contributions": pending
    }), 200


@app.route('/admin/contribution/approve/<int:contribution_id>', methods=['POST'])
def approve_contribution(contribution_id):
    """Admin: Approve a contribution"""
    data = request.get_json() or {}
    reviewer = data.get('reviewer', 'admin')
    
    success, message = Contribution.approve_contribution(contribution_id, reviewer)
    
    if success:
        return jsonify({"message": message}), 200
    else:
        return jsonify({"error": message}), 400


@app.route('/admin/contribution/reject/<int:contribution_id>', methods=['POST'])
def reject_contribution(contribution_id):
    """Admin: Reject a contribution"""
    data = request.get_json() or {}
    reviewer = data.get('reviewer', 'admin')
    
    success, message = Contribution.reject_contribution(contribution_id, reviewer)
    
    if success:
        return jsonify({"message": message}), 200
    else:
        return jsonify({"error": message}), 400


@app.route('/admin/verify/<email>', methods=['POST'])
def verify_user(email):
    """Admin: Verify a user"""
    user = Waitlist.query.filter_by(email=email).first()
    if not user:
        return jsonify({"error": "User not found"}), 404
    
    user.is_verified = True
    db.session.commit()
    
    return jsonify({"message": f"User {email} verified"}), 200


@app.route('/admin/mark-spam/<email>', methods=['POST'])
def mark_spam(email):
    """Admin: Mark user as spam (removes from rankings)"""
    user = Waitlist.query.filter_by(email=email).first()
    if not user:
        return jsonify({"error": "User not found"}), 404
    
    user.is_spam = True
    db.session.commit()
    
    return jsonify({"message": f"User {email} marked as spam"}), 200


@app.route('/admin/snapshot', methods=['POST'])
def take_snapshot():
    """
    Admin: Take global snapshot (locks all ranks)
    Call this before MVP or V1 release
    """
    count = Waitlist.take_global_snapshot()
    return jsonify({
        "message": f"Snapshot taken for {count} users",
        "timestamp": datetime.now().isoformat()
    }), 200


@app.route('/admin/all-users', methods=['GET'])
def get_all_users():
    """Admin: Get all waitlist users"""
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
            "status": user.status,
            "is_verified": user.is_verified,
            "badges": user.get_badges_list(),
            "snapshot_rank": user.snapshot_rank
        })
    
    return jsonify({
        "total": len(result),
        "users": result
    }), 200


# ========================================
# RUN APP
# ========================================

from datetime import datetime

if __name__ == '__main__':
    with app.app_context():
        db.create_all()
        print("=" * 60)
        print("SF WAITLIST & RANK SYSTEM")
        print("=" * 60)
        print("\nRANK FORMULA:")
        print("  Score = (Referrals × 2) + Contributions + Engagement + Early Bonus")
        print("\nREWARDS:")
        print("  Top 10: Lifetime free + SF Keyholder badge + 3x voting")
        print("  Top 100: 12 months free + 2x voting")
        print("  Top 300: 6 months free")
        print("  Top 1000: 1-2 months free")
        print("\nDISCOUNTS:")
        print("  1-500: 25% | 501-1000: 20% | 1001-1500: 15%")
        print("  1501-2000: 10% | 2001-2500: 5%")
        print("=" * 60)
    
    app.run(debug=True)