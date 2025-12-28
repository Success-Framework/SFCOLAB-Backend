from extensions import db
from datetime import datetime


class Waitlist(db.Model):
    """
    SF Waitlist System
    
    Rank Score = (Referrals × 2) + Contribution Points + Engagement Points + Early Commitment Bonus
    """
    __tablename__ = 'waitlist'
    
    id = db.Column(db.Integer, primary_key=True)
    email = db.Column(db.String(255), unique=True, nullable=False)
    name = db.Column(db.String(255), nullable=True)
    referral_code = db.Column(db.String(50), unique=True, nullable=False)
    referred_by = db.Column(db.String(50), nullable=True)
    
    # Scoring Components
    referral_count = db.Column(db.Integer, default=0)  # +2 points each
    contribution_points = db.Column(db.Integer, default=0)  # Small: 5, Medium: 10, High: 20
    engagement_points = db.Column(db.Integer, default=0)  # Small recurring bonuses
    early_commitment_bonus = db.Column(db.Integer, default=0)  # One-time baseline boost
    
    # Calculated total score
    total_rank_score = db.Column(db.Integer, default=0)
    
    # Status & Badges
    status = db.Column(db.String(50), default="waitlist")  # waitlist, mvp, v1, active
    badges = db.Column(db.String(500), default="")  # Comma-separated badges
    
    # Access & Rewards
    free_access_months = db.Column(db.Integer, default=0)
    discount_percentage = db.Column(db.Integer, default=0)
    voting_weight = db.Column(db.Integer, default=1)  # 1 = normal, 2 = top 100, 3 = top 10
    
    # Verification
    is_verified = db.Column(db.Boolean, default=False)
    is_spam = db.Column(db.Boolean, default=False)
    
    # Timestamps
    created_at = db.Column(db.DateTime, default=datetime.now)
    snapshot_rank = db.Column(db.Integer, nullable=True)  # Rank at snapshot time
    snapshot_date = db.Column(db.DateTime, nullable=True)
    
    def __init__(self, email, name=None, referred_by=None):
        self.email = email
        self.name = name
        self.referred_by = referred_by
        self.referral_code = self.generate_referral_code()
        self.calculate_early_bonus()
    
    @staticmethod
    def generate_referral_code():
        """Generate unique 8-character referral code"""
        import uuid
        return uuid.uuid4().hex[:8].upper()
    
    def calculate_early_bonus(self):
        """
        Early signup bonus decreases over time
        - Before Jan 1: 50 points
        - Jan 1-10: 30 points
        - Jan 10-Feb 1: 15 points
        - After Feb 1: 0 points
        """
        now = datetime.now()
        jan_1 = datetime(2025, 1, 1)
        jan_10 = datetime(2025, 1, 10)
        feb_1 = datetime(2025, 2, 1)
        
        if now < jan_1:
            self.early_commitment_bonus = 50
        elif now < jan_10:
            self.early_commitment_bonus = 30
        elif now < feb_1:
            self.early_commitment_bonus = 15
        else:
            self.early_commitment_bonus = 0
        
        self.update_total_score()
    
    def update_total_score(self):
        """
        Calculate total rank score
        Score = (Referrals × 2) + Contribution Points + Engagement Points + Early Commitment Bonus
        """
        self.total_rank_score = (
            (self.referral_count * 2) +
            self.contribution_points +
            self.engagement_points +
            self.early_commitment_bonus
        )
        return self.total_rank_score
    
    def add_referral(self):
        """Add a verified referral (+2 points)"""
        self.referral_count += 1
        self.update_total_score()
    
    def add_contribution(self, points, description=""):
        """
        Add contribution points
        - Small contribution: 5 points
        - Medium contribution: 10 points
        - High-impact contribution: 20 points
        """
        if points not in [5, 10, 20]:
            return False, "Invalid contribution points. Use 5, 10, or 20."
        
        self.contribution_points += points
        self.update_total_score()
        return True, f"Added {points} contribution points"
    
    def add_engagement(self, points=1):
        """Add small engagement bonus"""
        self.engagement_points += points
        self.update_total_score()
    
    def add_badge(self, badge):
        """Add a badge to user"""
        current = self.badges.split(",") if self.badges else []
        if badge not in current:
            current.append(badge)
            self.badges = ",".join(filter(None, current))
    
    def get_badges_list(self):
        """Get badges as list"""
        return [b for b in self.badges.split(",") if b]
    
    def get_current_rank(self):
        """Get current rank based on total score (higher score = better rank)"""
        higher_scores = Waitlist.query.filter(
            Waitlist.total_rank_score > self.total_rank_score,
            Waitlist.is_spam == False
        ).count()
        return higher_scores + 1
    
    def calculate_rewards(self):
        """
        Calculate rewards based on rank
        Must be called after snapshot
        """
        rank = self.snapshot_rank or self.get_current_rank()
        
        # Free Access (Time-Limited)
        if rank <= 10:
            self.free_access_months = 999  # Lifetime
            self.voting_weight = 3
            self.add_badge("sf_keyholder")
            self.add_badge("founding_member")
        elif rank <= 100:
            self.free_access_months = 12
            self.voting_weight = 2
            self.add_badge("founding_member")
        elif rank <= 300:
            self.free_access_months = 6
            self.add_badge("founding_member")
        elif rank <= 1000:
            self.free_access_months = 2
            self.add_badge("founding_member")
        elif rank <= 10000:
            self.add_badge("early_10k")
        
        # Lifetime Discounts
        if rank <= 500:
            self.discount_percentage = 25
        elif rank <= 1000:
            self.discount_percentage = 20
        elif rank <= 1500:
            self.discount_percentage = 15
        elif rank <= 2000:
            self.discount_percentage = 10
        elif rank <= 2500:
            self.discount_percentage = 5
    
    def take_snapshot(self):
        """Lock rank at snapshot time"""
        self.snapshot_rank = self.get_current_rank()
        self.snapshot_date = datetime.now()
        self.calculate_rewards()
    
    @staticmethod
    def signup(email, name=None, referred_by=None):
        """Sign up new user to waitlist"""
        existing = Waitlist.query.filter_by(email=email).first()
        if existing:
            return False, "Email already on waitlist", {
                "rank": existing.get_current_rank(),
                "referral_code": existing.referral_code,
                "total_score": existing.total_rank_score
            }
        
        new_entry = Waitlist(email=email, name=name, referred_by=referred_by)
        
        # If referred by someone, update their referral count
        if referred_by:
            referrer = Waitlist.query.filter_by(referral_code=referred_by).first()
            if referrer and not referrer.is_spam:
                referrer.add_referral()
        
        db.session.add(new_entry)
        db.session.commit()
        
        return True, "Successfully joined waitlist", {
            "rank": new_entry.get_current_rank(),
            "referral_code": new_entry.referral_code,
            "total_score": new_entry.total_rank_score,
            "early_bonus": new_entry.early_commitment_bonus
        }
    
    @staticmethod
    def get_leaderboard(limit=20):
        """Get top 20 users (as per documentation)"""
        top_users = Waitlist.query.filter_by(is_spam=False).order_by(
            Waitlist.total_rank_score.desc()
        ).limit(limit).all()
        
        result = []
        for i, user in enumerate(top_users, 1):
            result.append({
                "rank": i,
                "name": user.name or "Anonymous",
                "total_score": user.total_rank_score,
                "referrals": user.referral_count,
                "contributions": user.contribution_points,
                "badges": user.get_badges_list()
            })
        return result
    
    @staticmethod
    def get_stats():
        """Get waitlist statistics"""
        total = Waitlist.query.filter_by(is_spam=False).count()
        verified = Waitlist.query.filter_by(is_verified=True, is_spam=False).count()
        
        return {
            "total_signups": total,
            "verified_users": verified,
            "mvp_target": 1000,
            "v1_target": 10000,
            "spots_to_mvp": max(0, 1000 - total),
            "spots_to_v1": max(0, 10000 - total)
        }
    
    @staticmethod
    def take_global_snapshot():
        """Take snapshot for all users (call before MVP/V1 release)"""
        all_users = Waitlist.query.filter_by(is_spam=False).order_by(
            Waitlist.total_rank_score.desc()
        ).all()
        
        for i, user in enumerate(all_users, 1):
            user.snapshot_rank = i
            user.snapshot_date = datetime.now()
            user.calculate_rewards()
        
        db.session.commit()
        return len(all_users)