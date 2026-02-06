"""
High School Management System API

A super simple FastAPI application that allows students to view and sign up
for extracurricular activities at Mergington High School.
"""

from fastapi import FastAPI, HTTPException, Header, Response
from fastapi.staticfiles import StaticFiles
from fastapi.responses import RedirectResponse
import os
import json
import uuid
from pathlib import Path
from typing import Optional

app = FastAPI(title="Mergington High School API",
              description="API for viewing and signing up for extracurricular activities")

# Mount the static files directory
current_dir = Path(__file__).parent
app.mount("/static", StaticFiles(directory=os.path.join(Path(__file__).parent,
          "static")), name="static")

# Load teachers data from JSON file
teachers_file = os.path.join(Path(__file__).parent, "teachers.json")
with open(teachers_file, "r") as f:
    teachers_data = json.load(f)
    teachers = teachers_data["teachers"]

# In-memory session storage (maps session tokens to teacher emails)
sessions = {}

# In-memory activity database
activities = {
    "Chess Club": {
        "description": "Learn strategies and compete in chess tournaments",
        "schedule": "Fridays, 3:30 PM - 5:00 PM",
        "max_participants": 12,
        "participants": ["michael@mergington.edu", "daniel@mergington.edu"]
    },
    "Programming Class": {
        "description": "Learn programming fundamentals and build software projects",
        "schedule": "Tuesdays and Thursdays, 3:30 PM - 4:30 PM",
        "max_participants": 20,
        "participants": ["emma@mergington.edu", "sophia@mergington.edu"]
    },
    "Gym Class": {
        "description": "Physical education and sports activities",
        "schedule": "Mondays, Wednesdays, Fridays, 2:00 PM - 3:00 PM",
        "max_participants": 30,
        "participants": ["john@mergington.edu", "olivia@mergington.edu"]
    },
    "Soccer Team": {
        "description": "Join the school soccer team and compete in matches",
        "schedule": "Tuesdays and Thursdays, 4:00 PM - 5:30 PM",
        "max_participants": 22,
        "participants": ["liam@mergington.edu", "noah@mergington.edu"]
    },
    "Basketball Team": {
        "description": "Practice and play basketball with the school team",
        "schedule": "Wednesdays and Fridays, 3:30 PM - 5:00 PM",
        "max_participants": 15,
        "participants": ["ava@mergington.edu", "mia@mergington.edu"]
    },
    "Art Club": {
        "description": "Explore your creativity through painting and drawing",
        "schedule": "Thursdays, 3:30 PM - 5:00 PM",
        "max_participants": 15,
        "participants": ["amelia@mergington.edu", "harper@mergington.edu"]
    },
    "Drama Club": {
        "description": "Act, direct, and produce plays and performances",
        "schedule": "Mondays and Wednesdays, 4:00 PM - 5:30 PM",
        "max_participants": 20,
        "participants": ["ella@mergington.edu", "scarlett@mergington.edu"]
    },
    "Math Club": {
        "description": "Solve challenging problems and participate in math competitions",
        "schedule": "Tuesdays, 3:30 PM - 4:30 PM",
        "max_participants": 10,
        "participants": ["james@mergington.edu", "benjamin@mergington.edu"]
    },
    "Debate Team": {
        "description": "Develop public speaking and argumentation skills",
        "schedule": "Fridays, 4:00 PM - 5:30 PM",
        "max_participants": 12,
        "participants": ["charlotte@mergington.edu", "henry@mergington.edu"]
    }
}


@app.get("/")
def root():
    return RedirectResponse(url="/static/index.html")


@app.get("/activities")
def get_activities():
    return activities


@app.post("/auth/login")
def login(email: str, password: str, response: Response):
    """Authenticate a teacher and create a session"""
    # Check if teacher exists and password is correct
    if email not in teachers:
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    if teachers[email]["password"] != password:
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    # Create session token
    session_token = str(uuid.uuid4())
    sessions[session_token] = email
    
    # Set session cookie
    response.set_cookie(key="session_token", value=session_token, httponly=True)
    
    return {
        "message": "Login successful",
        "teacher_name": teachers[email]["name"],
        "email": email
    }


@app.post("/auth/logout")
def logout(response: Response, session_token: Optional[str] = Header(None, alias="Cookie")):
    """Logout a teacher and destroy the session"""
    # Extract session token from cookie
    if session_token and "session_token=" in session_token:
        token = session_token.split("session_token=")[1].split(";")[0]
        if token in sessions:
            del sessions[token]
    
    # Clear session cookie
    response.delete_cookie(key="session_token")
    
    return {"message": "Logout successful"}


@app.get("/auth/status")
def auth_status(cookie: Optional[str] = Header(None)):
    """Check if user is authenticated"""
    # Extract session token from cookie
    if not cookie or "session_token=" not in cookie:
        return {"authenticated": False}
    
    token = cookie.split("session_token=")[1].split(";")[0]
    
    if token in sessions:
        email = sessions[token]
        return {
            "authenticated": True,
            "teacher_name": teachers[email]["name"],
            "email": email
        }
    
    return {"authenticated": False}


def verify_teacher_session(cookie: Optional[str] = Header(None)) -> str:
    """Verify that the request has a valid teacher session"""
    if not cookie or "session_token=" not in cookie:
        raise HTTPException(status_code=401, detail="Authentication required")
    
    token = cookie.split("session_token=")[1].split(";")[0]
    
    if token not in sessions:
        raise HTTPException(status_code=401, detail="Invalid or expired session")
    
    return sessions[token]


@app.post("/activities/{activity_name}/signup")
def signup_for_activity(activity_name: str, email: str, cookie: Optional[str] = Header(None)):
    """Sign up a student for an activity (requires teacher authentication)"""
    # Verify teacher is authenticated
    verify_teacher_session(cookie)
    
    # Validate activity exists
    if activity_name not in activities:
        raise HTTPException(status_code=404, detail="Activity not found")

    # Get the specific activity
    activity = activities[activity_name]

    # Validate student is not already signed up
    if email in activity["participants"]:
        raise HTTPException(
            status_code=400,
            detail="Student is already signed up"
        )

    # Add student
    activity["participants"].append(email)
    return {"message": f"Signed up {email} for {activity_name}"}


@app.delete("/activities/{activity_name}/unregister")
def unregister_from_activity(activity_name: str, email: str, cookie: Optional[str] = Header(None)):
    """Unregister a student from an activity (requires teacher authentication)"""
    # Verify teacher is authenticated
    verify_teacher_session(cookie)
    
    # Validate activity exists
    if activity_name not in activities:
        raise HTTPException(status_code=404, detail="Activity not found")

    # Get the specific activity
    activity = activities[activity_name]

    # Validate student is signed up
    if email not in activity["participants"]:
        raise HTTPException(
            status_code=400,
            detail="Student is not signed up for this activity"
        )

    # Remove student
    activity["participants"].remove(email)
    return {"message": f"Unregistered {email} from {activity_name}"}
