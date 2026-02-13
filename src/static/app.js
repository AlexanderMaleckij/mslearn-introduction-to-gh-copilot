document.addEventListener("DOMContentLoaded", () => {
  const activitiesList = document.getElementById("activities-list");
  const activitySelect = document.getElementById("activity");
  const signupForm = document.getElementById("signup-form");
  const messageDiv = document.getElementById("message");

  // Function to fetch activities from API
  async function fetchActivities() {
    try {
      // Force a fresh response (avoid cached GETs)
      const response = await fetch("/activities", { cache: "no-store" });
      const activities = await response.json();

      // Clear loading message and reset activity select
      activitiesList.innerHTML = "";
      activitySelect.innerHTML = '<option value="">-- Select an activity --</option>'; // avoid duplicate options on re-fetch

      // Populate activities list
      Object.entries(activities).forEach(([name, details]) => {
        const activityCard = document.createElement("div");
        activityCard.className = "activity-card";

        const spotsLeft = details.max_participants - details.participants.length;

        activityCard.innerHTML = `
          <h4>${name}</h4>
          <p>${details.description}</p>
          <p><strong>Schedule:</strong> ${details.schedule}</p>
          <p><strong>Availability:</strong> ${spotsLeft} spots left</p>

          <div class="participants-section">
            <strong>Participants:</strong>
            ${
              details.participants && details.participants.length
                ? ` <ul class="participants-list">\n              ${details.participants.map(p => `<li class="participant-item">\n                  <span class="participant-name">${p}</span>\n                  <button class="remove-participant" data-activity="${name}" data-email="${p}" aria-label="Remove ${p}">×</button>\n                </li>`).join('')}\n            </ul>`
                : `<p class="info" style="display:inline-block; margin-left:8px;">No participants yet</p>`
            }
          </div>
        `;

        activitiesList.appendChild(activityCard);

        // Add option to select dropdown
        const option = document.createElement("option");
        option.value = name;
        option.textContent = name;
        activitySelect.appendChild(option);
      });
    } catch (error) {
      activitiesList.innerHTML = "<p>Failed to load activities. Please try again later.</p>";
      console.error("Error fetching activities:", error);
    }
  }

  // Handle form submission
  signupForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    const email = document.getElementById("email").value;
    const activity = document.getElementById("activity").value;

    try {
      const response = await fetch(
        `/activities/${encodeURIComponent(activity)}/signup?email=${encodeURIComponent(email)}`,
        {
          method: "POST",
        }
      );

      const result = await response.json();

      if (response.ok) {
        messageDiv.textContent = result.message;
        messageDiv.className = "success";
        signupForm.reset();
        activitySelect.selectedIndex = 0;
        // refresh activities so new participant appears immediately (await to ensure DOM update)
        await fetchActivities();
        console.debug('Activities refreshed after signup');
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
      messageDiv.textContent = "Failed to sign up. Please try again.";
      messageDiv.className = "error";
      messageDiv.classList.remove("hidden");
      console.error("Error signing up:", error);
    }
  });

  // Handle remove participant (event delegation)
  activitiesList.addEventListener("click", async (event) => {
    const target = event.target;
    if (!target.classList.contains("remove-participant")) return;

    const activity = target.dataset.activity;
    const email = target.dataset.email;

    if (!confirm(`Unregister ${email} from ${activity}?`)) return;

    try {
      const resp = await fetch(
        `/activities/${encodeURIComponent(activity)}/unregister?email=${encodeURIComponent(email)}`,
        { method: "POST" }
      );

      const result = await resp.json();

      if (resp.ok) {
        messageDiv.textContent = result.message;
        messageDiv.className = "success";
        // refresh list and wait for it to finish
        await fetchActivities();
        console.debug('Activities refreshed after removal');
      } else {
        messageDiv.textContent = result.detail || "Unable to remove participant";
        messageDiv.className = "error";
      }
    } catch (err) {
      messageDiv.textContent = "Failed to remove participant. Please try again.";
      messageDiv.className = "error";
      console.error(err);
    }

    messageDiv.classList.remove("hidden");
    setTimeout(() => messageDiv.classList.add("hidden"), 4000);
  });

  // Initialize app
  fetchActivities();
});
