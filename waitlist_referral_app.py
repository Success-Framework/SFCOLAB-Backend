import os
from flask import Flask, jsonify, request
from flask_cors import CORS
from extensions import db

app = Flask(__name__)
CORS(app)

# Database Configuration
app.config["SQLALCHEMY_DATABASE_URI"] = os.environ.get(
    "DATABASE_URL",
    "sqlite:///waitlist_referral.db"
)
app.config["SQLALCHEMY_TRACK_MODIFICATIONS"] = False

db.init_app(app)

# Import models AFTER db.init_app
from Waitlist import Waitlist
from Referral import Referrer, Referral, ReferralStats


# HOME ROUTE

@app.route('/')
def home():
    return jsonify({
        "message": "Waitlist & Referral API",
        "systems": {
            "waitlist": "For early access before Feb 1st",
            "referral": "Anytime - earn 2 weeks free per referral"
        }
    }), 200


# WAITLIST ENDPOINTS
# For early access before Feb 1st
# - First 1000 by Jan 10th = 3 months free
# - First 10000 by Feb 2nd = 1 month free

@app.route('/waitlist/signup', methods=['POST'])
def waitlist_signup():
    """
    Join the waitlist
    
    Body: { "email": "...", "name": "..." (optional) }
    
    Rewards:
    - First 1000 by Jan 10th = 3 months free
    - First 10000 by Feb 2nd = 1 month free
    """
    try:
        data = request.get_json()
        email = data.get('email')
        name = data.get('name')
        
        if not email:
            return jsonify({"error": "Email is required"}), 400
        
        success, message, result = Waitlist.signup(email=email, name=name)
        
        if success:
            return jsonify({"message": message, "data": result}), 201
        else:
            return jsonify({"message": message, "data": result}), 200
            
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route('/waitlist/position/<email>', methods=['GET'])
def get_waitlist_position(email):
    """Check your position and reward"""
    try:
        entry = Waitlist.query.filter_by(email=email).first()
        
        if not entry:
            return jsonify({"error": "Email not found in waitlist"}), 404
        
        return jsonify({
            "email": entry.email,
            "name": entry.name,
            "position": entry.get_position(),
            "reward_months": entry.calculate_reward(),
            "created_at": entry.created_at.isoformat() if entry.created_at else None
        }), 200
        
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route('/waitlist/all', methods=['GET'])
def get_all_waitlist():
    """Admin: Get all waitlist entries"""
    try:
        entries = Waitlist.get_all_entries()
        return jsonify({"total": len(entries), "entries": entries}), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route('/waitlist/stats', methods=['GET'])
def get_waitlist_stats():
    """Get waitlist statistics"""
    try:
        stats = Waitlist.get_stats()
        return jsonify(stats), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500


# REFERRAL ENDPOINTS
# Anytime - 2 weeks free per referral
# Separate from waitlist

@app.route('/referral/register', methods=['POST'])
def register_referrer():
    """
    Register to get your referral link
    
    Body: { "email": "...", "name": "..." (optional) }
    
    Returns: referral info + early backer status
    """
    try:
        data = request.get_json()
        email = data.get('email')
        name = data.get('name')
        
        if not email:
            return jsonify({"error": "Email is required"}), 400
        
        referrer, is_new = Referrer.get_or_create(email=email, name=name)
        
        return jsonify({
            "message": "Registered successfully" if is_new else "Already registered",
            "data": {
                "email": referrer.email,
                "name": referrer.name,
                "total_referrals": referrer.total_referrals,
                "reward_weeks": referrer.reward_weeks,
                "unclaimed_weeks": referrer.get_unclaimed_weeks(),
                "is_early_backer": referrer.is_early_backer,
                "achievements": referrer.get_achievements_list()
            }
        }), 201 if is_new else 200
        
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route('/referral/invite', methods=['POST'])
def invite_contact():
    """
    Invite a contact (create referral)
    
    Body: {
        "referrer_email": "your@email.com",
        "contact_email": "friend@email.com",
        "contact_name": "Friend Name" (optional)
    }
    
    Reward: 2 weeks free subscription per referral
    """
    try:
        data = request.get_json()
        referrer_email = data.get('referrer_email')
        contact_email = data.get('contact_email')
        contact_name = data.get('contact_name')
        
        if not referrer_email:
            return jsonify({"error": "referrer_email is required"}), 400
        if not contact_email:
            return jsonify({"error": "contact_email is required"}), 400
        
        success, message, result = Referral.create_referral(
            referrer_email=referrer_email,
            contact_email=contact_email,
            contact_name=contact_name
        )
        
        if success:
            return jsonify({"message": message, "data": result}), 201
        else:
            return jsonify({"error": message}), 400
            
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route('/referral/user/<email>', methods=['GET'])
def get_user_referrals(email):
    """
    Get user's referral tracking tab
    
    Shows:
    - List of users they invited
    - Total reward earned (weeks)
    - Unclaimed weeks
    - Achievements
    """
    try:
        result = Referral.get_user_referrals(email)
        
        if not result:
            return jsonify({"error": "User not found"}), 404
        
        return jsonify(result), 200
        
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route('/referral/claim', methods=['POST'])
def claim_reward():
    """
    Claim subscription weeks
    
    Body: { "email": "...", "weeks": 2 }
    """
    try:
        data = request.get_json()
        email = data.get('email')
        weeks = data.get('weeks', 0)
        
        if not email:
            return jsonify({"error": "Email is required"}), 400
        if weeks <= 0:
            return jsonify({"error": "Weeks must be positive"}), 400
        
        referrer = Referrer.query.filter_by(email=email).first()
        if not referrer:
            return jsonify({"error": "User not found"}), 404
        
        success, message = referrer.claim_reward(weeks)
        
        if success:
            return jsonify({
                "message": message,
                "remaining_weeks": referrer.get_unclaimed_weeks()
            }), 200
        else:
            return jsonify({"error": message}), 400
            
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route('/referral/stats', methods=['GET'])
def get_referral_stats():
    """Admin: Get overall referral stats"""
    try:
        stats = ReferralStats.get_overview()
        return jsonify(stats), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500


# ========================================
# RUN APP
# ========================================

if __name__ == '__main__':
    with app.app_context():
        db.create_all()
        
        print("=" * 60)
        print("WAITLIST & REFERRAL SYSTEM")
        print("=" * 60)
        print("\nSYSTEM 1: WAITLIST (Early Access)")
        print("-" * 40)
        print("  - First 1000 by Jan 10th = 3 months free")
        print("  - First 10000 by Feb 2nd = 1 month free")
        print("  - For access before Feb 1st")
        print("\n  Endpoints:")
        print("    POST /waitlist/signup")
        print("    GET  /waitlist/position/<email>")
        print("    GET  /waitlist/all")
        print("    GET  /waitlist/stats")
        print("\nSYSTEM 2: REFERRAL (Anytime)")
        print("-" * 40)
        print("  - 2 weeks free per referral")
        print("  - No limit on referrals")
        print("  - Early backer achievement (before Feb 1st)")
        print("\n  Endpoints:")
        print("    POST /referral/register")
        print("    POST /referral/invite")
        print("    GET  /referral/user/<email>")
        print("    POST /referral/claim")
        print("    GET  /referral/stats")
        print("=" * 60)
    
    app.run(debug=True)