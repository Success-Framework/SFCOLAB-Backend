from extensions import db
from datetime import datetime


class Waitlist(db.Model):
    __tablename__ = 'waitlist'
    
    id = db.Column(db.Integer, primary_key=True)
    email = db.Column(db.String(255), unique=True, nullable=False)
    name = db.Column(db.String(255), nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.now)
    
    # Reward tracking
    reward_months = db.Column(db.Integer, default=0)  # Free subscription months earned
    reward_claimed = db.Column(db.Boolean, default=False)
    
    def get_position(self):
        """Get this user's position in the waitlist"""
        position = Waitlist.query.filter(Waitlist.created_at <= self.created_at).count()
        return position
    
    def calculate_reward(self):
        """
        Calculate reward based on position and signup date
        - First 1000 by Jan 10th = 3 months
        - First 10000 by Feb 2nd = 1 month
        """
        position = self.get_position()
        
        jan_10_deadline = datetime(2025, 1, 10, 23, 59, 59)
        feb_2_deadline = datetime(2025, 2, 2, 23, 59, 59)
        
        if position <= 1000 and self.created_at <= jan_10_deadline:
            return 3  # 3 months free
        elif position <= 10000 and self.created_at <= feb_2_deadline:
            return 1  # 1 month free
        else:
            return 0  # No reward
    
    @staticmethod
    def signup(email, name=None):
        """Sign up a new user to the waitlist"""
        # Check if email already exists
        existing = Waitlist.query.filter_by(email=email).first()
        if existing:
            return False, "Email already on waitlist", {
                "position": existing.get_position(),
                "reward_months": existing.calculate_reward()
            }
        
        # Create new entry
        new_entry = Waitlist(email=email, name=name)
        db.session.add(new_entry)
        db.session.commit()
        
        # Calculate reward after commit (so position is accurate)
        reward = new_entry.calculate_reward()
        new_entry.reward_months = reward
        db.session.commit()
        
        return True, "Successfully joined waitlist", {
            "position": new_entry.get_position(),
            "reward_months": reward,
            "email": new_entry.email
        }
    
    @staticmethod
    def get_all_entries():
        """Get all waitlist entries ordered by signup date"""
        entries = Waitlist.query.order_by(Waitlist.created_at).all()
        result = []
        for i, entry in enumerate(entries, 1):
            result.append({
                "position": i,
                "email": entry.email,
                "name": entry.name,
                "reward_months": entry.calculate_reward(),
                "created_at": entry.created_at.isoformat() if entry.created_at else None
            })
        return result
    
    @staticmethod
    def get_stats():
        """Get waitlist statistics"""
        total = Waitlist.query.count()
        
        jan_10_deadline = datetime(2025, 1, 10, 23, 59, 59)
        feb_2_deadline = datetime(2025, 2, 2, 23, 59, 59)
        
        early_birds = Waitlist.query.filter(Waitlist.created_at <= jan_10_deadline).count()
        
        return {
            "total_signups": total,
            "spots_for_3_months": max(0, 1000 - min(total, 1000)),
            "spots_for_1_month": max(0, 10000 - min(total, 10000)),
            "early_birds_count": early_birds
        }