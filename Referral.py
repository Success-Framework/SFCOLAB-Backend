from extensions import db
from datetime import datetime


class Referrer(db.Model):
    """
    A user who can refer others
    
    Rewards:
    - 2 weeks free subscription per referral
    - No limit on referrals
    - "Early backer" achievement if registered before Feb 1st
    """
    __tablename__ = 'referrers'
    
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, nullable=True)  # Link to User if they have account
    email = db.Column(db.String(255), unique=True, nullable=False)
    name = db.Column(db.String(255), nullable=True)
    
    # Referral tracking
    total_referrals = db.Column(db.Integer, default=0)
    
    # Reward tracking (2 weeks per referral)
    reward_weeks = db.Column(db.Integer, default=0)
    reward_claimed_weeks = db.Column(db.Integer, default=0)
    
    # Achievements
    is_early_backer = db.Column(db.Boolean, default=False)
    achievements = db.Column(db.String(500), default="")
    
    created_at = db.Column(db.DateTime, default=datetime.now)
    updated_at = db.Column(db.DateTime, default=datetime.now, onupdate=datetime.now)
    
    # Relationship to people they referred
    referrals = db.relationship("Referral", back_populates="referrer", cascade="all, delete-orphan")
    
    def __init__(self, email, name=None, user_id=None):
        self.email = email
        self.name = name
        self.user_id = user_id
        self.check_early_backer()
    
    def check_early_backer(self):
        """Check if user qualifies for early backer achievement"""
        early_backer_deadline = datetime(2025, 2, 1, 23, 59, 59)
        if datetime.now() <= early_backer_deadline:
            self.is_early_backer = True
            self.add_achievement("early_backer")
    
    def add_achievement(self, achievement):
        """Add an achievement"""
        current = self.achievements.split(",") if self.achievements else []
        if achievement not in current:
            current.append(achievement)
            self.achievements = ",".join(filter(None, current))
    
    def get_achievements_list(self):
        """Get achievements as a list"""
        return [a for a in self.achievements.split(",") if a]
    
    def add_referral(self):
        """Add a referral and give 2 weeks reward"""
        self.total_referrals += 1
        self.reward_weeks += 2  # 2 weeks per referral
        
        # Achievement milestones
        if self.total_referrals >= 5:
            self.add_achievement("referrer_5")
        if self.total_referrals >= 10:
            self.add_achievement("referrer_10")
        if self.total_referrals >= 25:
            self.add_achievement("referrer_25")
    
    def get_unclaimed_weeks(self):
        """Get weeks not yet claimed"""
        return self.reward_weeks - self.reward_claimed_weeks
    
    def claim_reward(self, weeks_to_claim):
        """Claim subscription weeks"""
        unclaimed = self.get_unclaimed_weeks()
        if weeks_to_claim > unclaimed:
            return False, f"Only {unclaimed} weeks available"
        
        self.reward_claimed_weeks += weeks_to_claim
        db.session.commit()
        return True, f"Claimed {weeks_to_claim} weeks"
    
    @staticmethod
    def get_or_create(email, name=None, user_id=None):
        """Get existing referrer or create new one"""
        existing = Referrer.query.filter_by(email=email).first()
        if existing:
            return existing, False
        
        new_referrer = Referrer(email=email, name=name, user_id=user_id)
        db.session.add(new_referrer)
        db.session.commit()
        return new_referrer, True


class Referral(db.Model):
    """
    A record of someone being referred
    Tracks who invited who
    """
    __tablename__ = 'referrals'
    
    id = db.Column(db.Integer, primary_key=True)
    referrer_id = db.Column(db.Integer, db.ForeignKey('referrers.id'), nullable=False)
    
    # Referred person info
    contact_email = db.Column(db.String(255), nullable=False)
    contact_name = db.Column(db.String(255), nullable=True)
    
    # Timestamps
    referred_at = db.Column(db.DateTime, default=datetime.now)
    
    # Status
    status = db.Column(db.String(50), default="invited")  # invited, signed_up, subscribed
    
    # Relationship back to referrer
    referrer = db.relationship("Referrer", back_populates="referrals")
    
    # Unique constraint: can't refer same contact twice
    __table_args__ = (
        db.UniqueConstraint('referrer_id', 'contact_email', name='unique_referral'),
    )
    
    @staticmethod
    def create_referral(referrer_email, contact_email, contact_name=None):
        """
        Create a new referral
        
        Returns: (success, message, data)
        """
        # Find or create referrer
        referrer = Referrer.query.filter_by(email=referrer_email).first()
        if not referrer:
            referrer, _ = Referrer.get_or_create(email=referrer_email)
        
        # Can't refer yourself
        if referrer.email == contact_email:
            return False, "Cannot refer yourself", None
        
        # Check if already referred
        existing = Referral.query.filter_by(
            referrer_id=referrer.id,
            contact_email=contact_email
        ).first()
        
        if existing:
            return False, "You have already invited this contact", None
        
        # Create referral
        new_referral = Referral(
            referrer_id=referrer.id,
            contact_email=contact_email,
            contact_name=contact_name
        )
        
        db.session.add(new_referral)
        
        # Update referrer stats (+2 weeks reward)
        referrer.add_referral()
        
        db.session.commit()
        
        return True, "Referral recorded! You earned 2 weeks free subscription.", {
            "total_referrals": referrer.total_referrals,
            "reward_weeks": referrer.reward_weeks,
            "unclaimed_weeks": referrer.get_unclaimed_weeks()
        }
    
    @staticmethod
    def get_user_referrals(email):
        """
        Get all referrals for a user
        Shows: who they invited and their reward
        """
        referrer = Referrer.query.filter_by(email=email).first()
        
        if not referrer:
            return None
        
        referrals = Referral.query.filter_by(referrer_id=referrer.id).order_by(Referral.referred_at.desc()).all()
        
        return {
            "email": referrer.email,
            "name": referrer.name,
            "total_referrals": referrer.total_referrals,
            "reward_weeks": referrer.reward_weeks,
            "unclaimed_weeks": referrer.get_unclaimed_weeks(),
            "is_early_backer": referrer.is_early_backer,
            "achievements": referrer.get_achievements_list(),
            "invited_users": [
                {
                    "email": r.contact_email,
                    "name": r.contact_name,
                    "status": r.status,
                    "invited_at": r.referred_at.isoformat() if r.referred_at else None
                }
                for r in referrals
            ]
        }


class ReferralStats:
    """Helper class for admin statistics"""
    
    @staticmethod
    def get_overview():
        """Get overall referral stats"""
        total_referrers = Referrer.query.count()
        total_referrals = Referral.query.count()
        total_reward_weeks = db.session.query(db.func.sum(Referrer.reward_weeks)).scalar() or 0
        
        early_backers = Referrer.query.filter_by(is_early_backer=True).count()
        
        return {
            "total_referrers": total_referrers,
            "total_referrals": total_referrals,
            "total_reward_weeks_given": total_reward_weeks,
            "early_backers": early_backers
        }