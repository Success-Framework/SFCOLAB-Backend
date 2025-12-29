from extensions import db
from datetime import datetime


class Contribution(db.Model):
    """
    Track user contributions for ranking
    
    Types:
    - bug_report: Verified bug reports (5-20 points)
    - feature_feedback: Approved feature feedback (5-10 points)
    - testing: Testing new releases (5-10 points)
    - documentation: Writing docs/tutorials (10-20 points)
    - demo_project: Creating demos/integrations (10-20 points)
    - community_support: Helping other users (5-10 points)
    """
    __tablename__ = 'contributions'
    
    id = db.Column(db.Integer, primary_key=True)
    waitlist_id = db.Column(db.Integer, db.ForeignKey('waitlist.id'), nullable=False)
    
    contribution_type = db.Column(db.String(50), nullable=False)
    description = db.Column(db.String(500), nullable=True)
    points = db.Column(db.Integer, nullable=False)  # 5, 10, or 20
    
    # Verification
    status = db.Column(db.String(50), default="pending")  # pending, approved, rejected
    reviewed_by = db.Column(db.String(255), nullable=True)
    reviewed_at = db.Column(db.DateTime, nullable=True)
    
    created_at = db.Column(db.DateTime, default=datetime.now)
    
    # Valid contribution types and their point ranges
    CONTRIBUTION_TYPES = {
        "bug_report": {"min": 5, "max": 20, "label": "Bug Report"},
        "feature_feedback": {"min": 5, "max": 10, "label": "Feature Feedback"},
        "testing": {"min": 5, "max": 10, "label": "Release Testing"},
        "documentation": {"min": 10, "max": 20, "label": "Documentation/Tutorial"},
        "demo_project": {"min": 10, "max": 20, "label": "Demo Project/Integration"},
        "community_support": {"min": 5, "max": 10, "label": "Community Support"}
    }
    
    @staticmethod
    def submit_contribution(waitlist_id, contribution_type, description, points):
        """
        Submit a contribution for review
        Points must be 5, 10, or 20
        """
        if contribution_type not in Contribution.CONTRIBUTION_TYPES:
            return False, "Invalid contribution type", None
        
        if points not in [5, 10, 20]:
            return False, "Points must be 5, 10, or 20", None
        
        type_info = Contribution.CONTRIBUTION_TYPES[contribution_type]
        if points < type_info["min"] or points > type_info["max"]:
            return False, f"Points for {contribution_type} must be between {type_info['min']} and {type_info['max']}", None
        
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
        """Approve a contribution and add points to user"""
        from Waitlist import Waitlist
        
        contribution = Contribution.query.get(contribution_id)
        if not contribution:
            return False, "Contribution not found"
        
        if contribution.status != "pending":
            return False, f"Contribution already {contribution.status}"
        
        contribution.status = "approved"
        contribution.reviewed_by = reviewer
        contribution.reviewed_at = datetime.now()
        
        # Add points to waitlist user
        waitlist_user = Waitlist.query.get(contribution.waitlist_id)
        if waitlist_user:
            waitlist_user.add_contribution(contribution.points, contribution.description)
        
        db.session.commit()
        return True, f"Contribution approved. Added {contribution.points} points."
    
    @staticmethod
    def reject_contribution(contribution_id, reviewer):
        """Reject a contribution"""
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
        """Get all pending contributions for review"""
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
        """Get all contributions for a user"""
        contributions = Contribution.query.filter_by(waitlist_id=waitlist_id).all()
        return [{
            "id": c.id,
            "type": c.contribution_type,
            "description": c.description,
            "points": c.points,
            "status": c.status,
            "created_at": c.created_at.isoformat() if c.created_at else None
        } for c in contributions]