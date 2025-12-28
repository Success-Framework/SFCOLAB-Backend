from extensions import db
from datetime import datetime


class Contribution(db.Model):
    __tablename__ = 'contributions'
    
    id = db.Column(db.Integer, primary_key=True)
    waitlist_id = db.Column(db.Integer, db.ForeignKey('waitlist.id'), nullable=False)
    
    contribution_type = db.Column(db.String(50), nullable=False)
    description = db.Column(db.String(500), nullable=True)
    points = db.Column(db.Integer, nullable=False)
    
    status = db.Column(db.String(50), default="pending")
    reviewed_by = db.Column(db.String(255), nullable=True)
    reviewed_at = db.Column(db.DateTime, nullable=True)
    
    created_at = db.Column(db.DateTime, default=datetime.now)
    
    CONTRIBUTION_TYPES = {
        "bug_report": {"min": 5, "max": 20, "label": "Bug Report"},
        "feature_feedback": {"min": 5, "max": 10, "label": "Feature Feedback"},
        "testing": {"min": 5, "max": 10, "label": "Release Testing"},
        "documentation": {"min": 10, "max": 20, "label": "Documentation"},
        "demo_project": {"min": 10, "max": 20, "label": "Demo Project"},
        "community_support": {"min": 5, "max": 10, "label": "Community Support"}
    }
    
    @staticmethod
    def submit_contribution(waitlist_id, contribution_type, description, points):
        if contribution_type not in Contribution.CONTRIBUTION_TYPES:
            return False, "Invalid contribution type", None
        
        if points not in [5, 10, 20]:
            return False, "Points must be 5, 10, or 20", None
        
        contribution = Contribution(
            waitlist_id=waitlist_id,
            contribution_type=contribution_type,
            description=description,
            points=points
        )
        
        db.session.add(contribution)
        db.session.commit()
        
        return True, "Contribution submitted for review", {
            "id": contribution.id,
            "type": contribution_type,
            "points": points,
            "status": "pending"
        }
    
    @staticmethod
    def approve_contribution(contribution_id, reviewer):
        from Waitlist import Waitlist
        
        contribution = Contribution.query.get(contribution_id)
        if not contribution:
            return False, "Contribution not found"
        
        if contribution.status != "pending":
            return False, f"Contribution already {contribution.status}"
        
        contribution.status = "approved"
        contribution.reviewed_by = reviewer
        contribution.reviewed_at = datetime.now()
        
        waitlist_user = Waitlist.query.get(contribution.waitlist_id)
        if waitlist_user:
            waitlist_user.add_contribution(contribution.points, contribution.description)
        
        db.session.commit()
        return True, f"Contribution approved. Added {contribution.points} points."
    
    @staticmethod
    def reject_contribution(contribution_id, reviewer):
        contribution = Contribution.query.get(contribution_id)
        if not contribution:
            return False, "Contribution not found"
        
        contribution.status = "rejected"
        contribution.reviewed_by = reviewer
        contribution.reviewed_at = datetime.now()
        
        db.session.commit()
        return True, "Contribution rejected"
    
    @staticmethod
    def get_pending_contributions():
        pending = Contribution.query.filter_by(status="pending").all()
        return [{
            "id": c.id,
            "waitlist_id": c.waitlist_id,
            "type": c.contribution_type,
            "description": c.description,
            "points": c.points,
            "created_at": c.created_at.isoformat() if c.created_at else None
        } for c in pending]
    
    @staticmethod
    def get_user_contributions(waitlist_id):
        contributions = Contribution.query.filter_by(waitlist_id=waitlist_id).all()
        return [{
            "id": c.id,
            "type": c.contribution_type,
            "description": c.description,
            "points": c.points,
            "status": c.status,
            "created_at": c.created_at.isoformat() if c.created_at else None
        } for c in contributions]
