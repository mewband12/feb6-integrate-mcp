document.addEventListener("DOMContentLoaded", () => {
  const activitiesList = document.getElementById("activities-list");
  const messageDiv = document.getElementById("message");
  const userIcon = document.getElementById("user-icon");
  const userMenu = document.getElementById("user-menu");
  const loginBtn = document.getElementById("login-btn");
  const logoutBtn = document.getElementById("logout-btn");
  const loginModal = document.getElementById("login-modal");
  const loginForm = document.getElementById("login-form");
  const closeModal = document.querySelector(".close");
  const loggedOutMenu = document.getElementById("logged-out-menu");
  const loggedInMenu = document.getElementById("logged-in-menu");
  const teacherNameEl = document.getElementById("teacher-name");
  const loginMessage = document.getElementById("login-message");
  const registerModal = document.getElementById("register-modal");
  const registerForm = document.getElementById("register-form");
  const closeRegisterModal = document.querySelector(".close-register");
  const activityNameDisplay = document.querySelector(".activity-name-display");
  const registerMessage = document.getElementById("register-message");

  let isAuthenticated = false;
  let teacherName = "";
  let currentActivityName = "";

  // Check authentication status on page load
  async function checkAuthStatus() {
    try {
      const response = await fetch("/auth/status");
      const data = await response.json();
      
      if (data.authenticated) {
        isAuthenticated = true;
        teacherName = data.teacher_name;
        updateUIForAuth(true);
      } else {
        isAuthenticated = false;
        updateUIForAuth(false);
      }
    } catch (error) {
      console.error("Error checking auth status:", error);
      isAuthenticated = false;
      updateUIForAuth(false);
    }
  }

  // Update UI based on authentication status
  function updateUIForAuth(authenticated) {
    if (authenticated) {
      loggedOutMenu.classList.add("hidden");
      loggedInMenu.classList.remove("hidden");
      teacherNameEl.textContent = `Logged in as ${teacherName}`;
    } else {
      loggedOutMenu.classList.remove("hidden");
      loggedInMenu.classList.add("hidden");
      teacherNameEl.textContent = "";
    }
    // Refresh activities to show/hide register and delete buttons
    fetchActivities();
  }

  // Toggle user menu
  userIcon.addEventListener("click", (e) => {
    e.stopPropagation();
    userMenu.classList.toggle("hidden");
  });

  // Close menu when clicking outside
  document.addEventListener("click", () => {
    userMenu.classList.add("hidden");
  });

  userMenu.addEventListener("click", (e) => {
    e.stopPropagation();
  });

  // Show login modal
  loginBtn.addEventListener("click", () => {
    loginModal.classList.remove("hidden");
    userMenu.classList.add("hidden");
  });

  // Close login modal
  closeModal.addEventListener("click", () => {
    loginModal.classList.add("hidden");
    loginMessage.classList.add("hidden");
  });

  // Close modal when clicking outside
  window.addEventListener("click", (e) => {
    if (e.target === loginModal) {
      loginModal.classList.add("hidden");
      loginMessage.classList.add("hidden");
    }
    if (e.target === registerModal) {
      registerModal.classList.add("hidden");
      registerMessage.classList.add("hidden");
    }
  });

  // Close register modal
  closeRegisterModal.addEventListener("click", () => {
    registerModal.classList.add("hidden");
    registerMessage.classList.add("hidden");
  });

  // Handle login form submission
  loginForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    
    const email = document.getElementById("login-email").value;
    const password = document.getElementById("login-password").value;

    try {
      const response = await fetch(
        `/auth/login?email=${encodeURIComponent(email)}&password=${encodeURIComponent(password)}`,
        { method: "POST" }
      );

      const result = await response.json();

      if (response.ok) {
        loginMessage.textContent = result.message;
        loginMessage.className = "success";
        loginMessage.classList.remove("hidden");
        
        isAuthenticated = true;
        teacherName = result.teacher_name;
        
        setTimeout(() => {
          loginModal.classList.add("hidden");
          loginMessage.classList.add("hidden");
          loginForm.reset();
          updateUIForAuth(true);
        }, 1000);
      } else {
        loginMessage.textContent = result.detail || "Login failed";
        loginMessage.className = "error";
        loginMessage.classList.remove("hidden");
      }
    } catch (error) {
      loginMessage.textContent = "Failed to login. Please try again.";
      loginMessage.className = "error";
      loginMessage.classList.remove("hidden");
      console.error("Error logging in:", error);
    }
  });

  // Handle logout
  logoutBtn.addEventListener("click", async () => {
    try {
      const response = await fetch("/auth/logout", { method: "POST" });
      
      if (response.ok) {
        isAuthenticated = false;
        teacherName = "";
        updateUIForAuth(false);
        userMenu.classList.add("hidden");
      }
    } catch (error) {
      console.error("Error logging out:", error);
    }
  });

  // Function to fetch activities from API
  async function fetchActivities() {
    try {
      const response = await fetch("/activities");
      const activities = await response.json();

      // Clear loading message
      activitiesList.innerHTML = "";

      // Populate activities list
      Object.entries(activities).forEach(([name, details]) => {
        const activityCard = document.createElement("div");
        activityCard.className = "activity-card";

        const spotsLeft =
          details.max_participants - details.participants.length;

        // Create participants HTML with conditional delete icons
        const participantsHTML =
          details.participants.length > 0
            ? `<div class="participants-section">
              <h5>Participants:</h5>
              <ul class="participants-list">
                ${details.participants
                  .map(
                    (email) =>
                      `<li><span class="participant-email">${email}</span>${isAuthenticated ? `<button class="delete-btn" data-activity="${name}" data-email="${email}">❌</button>` : ''}</li>`
                  )
                  .join("")}
              </ul>
            </div>`
            : `<p><em>No participants yet</em></p>`;

        // Create register button only if authenticated
        const registerButtonHTML = isAuthenticated 
          ? `<button class="register-btn" data-activity="${name}">Register Student</button>`
          : '<p class="auth-notice-card"><em>⚠️ Teacher login required to register students</em></p>';

        activityCard.innerHTML = `
          <h4>${name}</h4>
          <p>${details.description}</p>
          <p><strong>Schedule:</strong> ${details.schedule}</p>
          <p><strong>Availability:</strong> ${spotsLeft} spots left</p>
          <div class="participants-container">
            ${participantsHTML}
          </div>
          <div class="card-actions">
            ${registerButtonHTML}
          </div>
        `;

        activitiesList.appendChild(activityCard);
      });

      // Add event listeners to register buttons (only if authenticated)
      if (isAuthenticated) {
        document.querySelectorAll(".register-btn").forEach((button) => {
          button.addEventListener("click", handleRegisterClick);
        });
        
        // Add event listeners to delete buttons
        document.querySelectorAll(".delete-btn").forEach((button) => {
          button.addEventListener("click", handleUnregister);
        });
      }
    } catch (error) {
      activitiesList.innerHTML =
        "<p>Failed to load activities. Please try again later.</p>";
      console.error("Error fetching activities:", error);
    }
  }

  // Handle register button click
  function handleRegisterClick(event) {
    const button = event.target;
    currentActivityName = button.getAttribute("data-activity");
    activityNameDisplay.textContent = `Activity: ${currentActivityName}`;
    registerModal.classList.remove("hidden");
  }

  // Handle unregister functionality
  async function handleUnregister(event) {
    const button = event.target;
    const activity = button.getAttribute("data-activity");
    const email = button.getAttribute("data-email");

    try {
      const response = await fetch(
        `/activities/${encodeURIComponent(
          activity
        )}/unregister?email=${encodeURIComponent(email)}`,
        {
          method: "DELETE",
        }
      );

      const result = await response.json();

      if (response.ok) {
        messageDiv.textContent = result.message;
        messageDiv.className = "success";

        // Refresh activities list to show updated participants
        fetchActivities();
      } else {
        messageDiv.textContent = result.detail || "An error occurred";
        messageDiv.className = "error";
      }

      messageDiv.classList.remove("hidden");

      // Hide message after 5 seconds
      setTimeout(() => {
        messageDiv.classList.add("hidden");
      }, 5000);
    } catch (error) {
      messageDiv.textContent = "Failed to unregister. Please try again.";
      messageDiv.className = "error";
      messageDiv.classList.remove("hidden");
      console.error("Error unregistering:", error);
    }
  }

  // Handle form submission
  registerForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    const email = document.getElementById("student-email").value;
    const activity = currentActivityName;

    try {
      const response = await fetch(
        `/activities/${encodeURIComponent(
          activity
        )}/signup?email=${encodeURIComponent(email)}`,
        {
          method: "POST",
        }
      );

      const result = await response.json();

      if (response.ok) {
        registerMessage.textContent = result.message;
        registerMessage.className = "success";
        registerForm.reset();

        // Refresh activities list to show updated participants
        fetchActivities();

        // Close modal after a short delay
        setTimeout(() => {
          registerModal.classList.add("hidden");
          registerMessage.classList.add("hidden");
        }, 1500);
      } else {
        registerMessage.textContent = result.detail || "An error occurred";
        registerMessage.className = "error";
      }

      registerMessage.classList.remove("hidden");

      // Hide message after 5 seconds
      setTimeout(() => {
        registerMessage.classList.add("hidden");
      }, 5000);
    } catch (error) {
      registerMessage.textContent = "Failed to sign up. Please try again.";
      registerMessage.className = "error";
      registerMessage.classList.remove("hidden");
      console.error("Error signing up:", error);
    }
  });

  // Initialize app
  checkAuthStatus();
});
