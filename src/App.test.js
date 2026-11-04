import React from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import "@testing-library/jest-dom";
import App from "./App";
import { AuthProvider } from "./context/AuthContext";
import { UiProvider } from "./context/UiContext";
import * as api from "./api/client";
import { resetLocalData } from "./api/client";

function renderAt(path) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <UiProvider>
        <AuthProvider>
          <App />
        </AuthProvider>
      </UiProvider>
    </MemoryRouter>
  );
}

async function signUp(name = "Rahim Uddin", email = "rahim@example.com") {
  userEvent.type(screen.getByLabelText("Full name"), name);
  userEvent.type(screen.getByLabelText("Email"), email);
  userEvent.type(screen.getByLabelText("Password"), "Secret123");
  userEvent.type(screen.getByLabelText("Confirm password"), "Secret123");
  userEvent.click(screen.getByRole("button", { name: "Create account" }));
}

beforeEach(() => {
  window.localStorage.clear();
  resetLocalData();
  document.documentElement.setAttribute("lang", "en");
  window.scrollTo = jest.fn();
});

test("home page shows featured campaigns and stories", async () => {
  renderAt("/");
  expect(screen.getByRole("heading", { name: /small businesses/i })).toBeInTheDocument();
  expect(await screen.findByText("Mishu's Pottery Studio")).toBeInTheDocument();
  expect(screen.getByText("Nadia's Bakery")).toBeInTheDocument();
});

test("register validates input", async () => {
  renderAt("/register");
  userEvent.type(screen.getByLabelText("Email"), "not-an-email");
  userEvent.type(screen.getByLabelText("Password"), "short");
  userEvent.type(screen.getByLabelText("Confirm password"), "different");
  userEvent.click(screen.getByRole("button", { name: "Create account" }));
  expect(await screen.findByText("Please enter your full name.")).toBeInTheDocument();
  expect(screen.getByText("Enter a valid email address.")).toBeInTheDocument();
  expect(screen.getByText(/at least 8 characters/)).toBeInTheDocument();
  expect(screen.getByText("Passwords do not match.")).toBeInTheDocument();
});

test("a new user can register, log out and log back in", async () => {
  renderAt("/register");
  await signUp();
  expect(await screen.findByRole("heading", { name: "Hi, Rahim" })).toBeInTheDocument();

  fireEvent.click(screen.getByRole("button", { name: /Rahim/ }));
  userEvent.click(await screen.findByRole("menuitem", { name: "Log out" }));
  expect(await screen.findByRole("link", { name: "Log in" })).toBeInTheDocument();

  userEvent.click(screen.getByRole("link", { name: "Log in" }));
  await screen.findByRole("heading", { name: "Welcome back" });
  userEvent.type(screen.getByLabelText("Email"), "rahim@example.com");
  userEvent.type(screen.getByLabelText("Password"), "wrong-pass");
  userEvent.click(screen.getByRole("button", { name: "Log in" }));
  expect(await screen.findByText("Incorrect email or password.")).toBeInTheDocument();

  userEvent.clear(screen.getByLabelText("Password"));
  userEvent.type(screen.getByLabelText("Password"), "Secret123");
  userEvent.click(screen.getByRole("button", { name: "Log in" }));
  expect(await screen.findByRole("heading", { name: "Hi, Rahim" })).toBeInTheDocument();
});

test("dashboard redirects to login when signed out", async () => {
  renderAt("/dashboard");
  expect(await screen.findByRole("heading", { name: "Welcome back" })).toBeInTheDocument();
});

test("a signed-in user can back a campaign", async () => {
  renderAt("/register");
  await signUp();
  await screen.findByRole("heading", { name: "Hi, Rahim" });

  userEvent.click(screen.getAllByRole("link", { name: "Discover" })[0]);
  userEvent.click(await screen.findByText("Retro Cafe"));
  await screen.findByRole("heading", { name: "Retro Cafe" });
  expect(screen.getByText("৳1,00,000")).toBeInTheDocument();

  userEvent.click(screen.getByRole("button", { name: "৳2,500" }));
  userEvent.type(screen.getByLabelText("Message (optional)"), "Good luck!");
  userEvent.click(screen.getByRole("button", { name: "Back with ৳2,500" }));

  expect(await screen.findByText("Thank you, Rahim!")).toBeInTheDocument();
  expect(screen.getByText("৳1,02,500")).toBeInTheDocument();
  userEvent.click(screen.getByRole("tab", { name: /Backers/ }));
  expect(await screen.findByText("“Good luck!”")).toBeInTheDocument();
});

test("a signed-in user can start a campaign", async () => {
  renderAt("/register");
  await signUp();
  await screen.findByRole("heading", { name: "Hi, Rahim" });

  userEvent.click(screen.getAllByRole("link", { name: "Start a campaign" })[0]);
  await screen.findByRole("heading", { name: "Tell us about your business" });
  userEvent.type(screen.getByLabelText("Campaign title"), "Rahim's Tea Stall");
  userEvent.selectOptions(screen.getByLabelText("Category"), "Food & Drink");
  userEvent.type(screen.getByLabelText("Location"), "Mirpur, Dhaka");
  userEvent.type(screen.getByLabelText("Funding goal (৳)"), "50000");
  userEvent.type(screen.getByLabelText("Short summary"), "A clean, friendly tea stall near the stadium.");
  userEvent.type(
    screen.getByLabelText("Your story"),
    "I have sold tea from a flask for five years. A proper stall with a stove and seating will let me serve more customers every day."
  );
  userEvent.click(screen.getByRole("button", { name: "Publish campaign" }));

  expect(await screen.findByRole("heading", { name: "Rahim's Tea Stall" })).toBeInTheDocument();
  expect(screen.getByText(/This is your campaign/)).toBeInTheDocument();

  // Owner can post an update.
  userEvent.click(screen.getByRole("tab", { name: /Updates/ }));
  userEvent.click(await screen.findByRole("button", { name: /Post an update/ }));
  userEvent.type(screen.getByLabelText("Update title"), "Stove installed");
  userEvent.type(screen.getByLabelText("What's new?"), "The new stove arrived today. Thank you all!");
  userEvent.click(screen.getByRole("button", { name: "Post update" }));
  expect(await screen.findByRole("heading", { name: "Stove installed" })).toBeInTheDocument();

  // Owner can edit the campaign.
  userEvent.click(screen.getByRole("link", { name: /Edit/ }));
  const title = await screen.findByLabelText("Campaign title");
  userEvent.clear(title);
  userEvent.type(title, "Rahim's Tea Corner");
  userEvent.click(screen.getByRole("button", { name: "Save changes" }));
  expect(await screen.findByRole("heading", { name: "Rahim's Tea Corner" })).toBeInTheDocument();
});

test("unknown routes show the 404 page", () => {
  renderAt("/nope");
  expect(screen.getByRole("heading", { name: "We couldn't find that page" })).toBeInTheDocument();
});

test("unknown campaign shows 404", async () => {
  renderAt("/campaigns/does-not-exist");
  await waitFor(() =>
    expect(screen.getByRole("heading", { name: "We couldn't find that page" })).toBeInTheDocument()
  );
});

test("a signed-in user can save a campaign and see it on the dashboard", async () => {
  renderAt("/register");
  await signUp();
  await screen.findByRole("heading", { name: "Hi, Rahim" });

  userEvent.click(screen.getAllByRole("link", { name: "Discover" })[0]);
  await screen.findByText("Retro Cafe");
  fireEvent.click(screen.getAllByRole("button", { name: "Save campaign" })[0]);
  expect(await screen.findByText("Saved to your list.")).toBeInTheDocument();

  userEvent.click(screen.getAllByRole("link", { name: "Jogaar home" })[0]);
  fireEvent.click(screen.getByRole("button", { name: /Rahim/ }));
  userEvent.click(await screen.findByRole("menuitem", { name: "Saved campaigns" }));
  expect(await screen.findAllByRole("button", { name: "Remove from saved" })).toHaveLength(1);
});

test("a user can change their password", async () => {
  renderAt("/register");
  await signUp();
  await screen.findByRole("heading", { name: "Hi, Rahim" });
  userEvent.click(screen.getByRole("tab", { name: "Profile settings" }));

  userEvent.type(await screen.findByLabelText("Current password"), "nope");
  userEvent.type(screen.getByLabelText("New password"), "NewSecret456");
  userEvent.type(screen.getByLabelText("Confirm new password"), "NewSecret456");
  userEvent.click(screen.getByRole("button", { name: "Change password" }));
  expect(await screen.findByText("Your current password is incorrect.")).toBeInTheDocument();

  userEvent.clear(screen.getByLabelText("Current password"));
  userEvent.type(screen.getByLabelText("Current password"), "Secret123");
  userEvent.click(screen.getByRole("button", { name: "Change password" }));
  expect(await screen.findByText("Password changed.")).toBeInTheDocument();
});

test("a backer can choose a reward and it is recorded", async () => {
  renderAt("/register");
  await signUp();
  await screen.findByRole("heading", { name: "Hi, Rahim" });

  userEvent.click(screen.getAllByRole("link", { name: "Discover" })[0]);
  userEvent.click(await screen.findByText("Mishu's Pottery Studio"));
  await screen.findByRole("heading", { name: "Mishu's Pottery Studio" });

  // Choosing the ৳5,000 vase set raises the amount to the reward minimum.
  userEvent.click(screen.getByRole("radio", { name: /Vase set/ }));
  expect(screen.getByLabelText("Amount (৳)")).toHaveValue(5000);

  // Going below the minimum is rejected.
  userEvent.clear(screen.getByLabelText("Amount (৳)"));
  userEvent.type(screen.getByLabelText("Amount (৳)"), "1000");
  userEvent.click(screen.getByRole("button", { name: "Back with ৳1,000" }));
  expect(await screen.findByText("Your contribution is below this reward's minimum.")).toBeInTheDocument();

  userEvent.clear(screen.getByLabelText("Amount (৳)"));
  userEvent.type(screen.getByLabelText("Amount (৳)"), "5000");
  userEvent.click(screen.getByRole("button", { name: "Back with ৳5,000" }));
  expect(await screen.findByText("Your reward: Vase set")).toBeInTheDocument();

  userEvent.click(screen.getByRole("tab", { name: /Backers/ }));
  expect(await screen.findByText("Reward: Vase set")).toBeInTheDocument();
});

test("signed-in users can comment and delete their own comments", async () => {
  window.confirm = jest.fn(() => true);
  renderAt("/campaigns/karim-poultry");
  userEvent.click(await screen.findByRole("tab", { name: /Comments/ }));
  expect(screen.getByText("Great to see local farms growing. Good luck, Karim bhai!")).toBeInTheDocument();
  userEvent.click(screen.getByRole("link", { name: "Log in to join the conversation." }));

  userEvent.click(await screen.findByRole("link", { name: "Create an account" }));
  await signUp();
  userEvent.click(await screen.findByRole("tab", { name: /Comments/ }));
  userEvent.type(screen.getByLabelText("Your comment"), "Count me in for eggs!");
  const post = screen.getByRole("button", { name: "Post comment" });
  await waitFor(() => expect(post).toBeEnabled());
  userEvent.click(post);
  expect(await screen.findByText("Comment posted.")).toBeInTheDocument();
  expect(screen.getByText("Count me in for eggs!", { selector: ".comment p" })).toBeInTheDocument();

  userEvent.click(screen.getByRole("button", { name: "Delete comment" }));
  await waitFor(() =>
    expect(screen.queryByText("Count me in for eggs!", { selector: ".comment p" })).not.toBeInTheDocument()
  );
});

test("an owner can add reward tiers when starting a campaign", async () => {
  renderAt("/register");
  await signUp();
  await screen.findByRole("heading", { name: "Hi, Rahim" });
  userEvent.click(screen.getAllByRole("link", { name: "Start a campaign" })[0]);
  await screen.findByRole("heading", { name: "Tell us about your business" });

  userEvent.type(screen.getByLabelText("Campaign title"), "Rahim's Tea Stall");
  userEvent.selectOptions(screen.getByLabelText("Category"), "Food & Drink");
  userEvent.type(screen.getByLabelText("Location"), "Mirpur, Dhaka");
  userEvent.type(screen.getByLabelText("Funding goal (৳)"), "50000");
  userEvent.type(screen.getByLabelText("Short summary"), "A clean, friendly tea stall near the stadium.");
  userEvent.type(
    screen.getByLabelText("Your story"),
    "I have sold tea from a flask for five years. A proper stall with a stove and seating will let me serve more customers every day."
  );
  userEvent.click(screen.getByRole("button", { name: "Add a reward" }));
  userEvent.click(screen.getByRole("button", { name: "Publish campaign" }));
  expect(await screen.findByText("Every reward needs a title.")).toBeInTheDocument();

  userEvent.type(screen.getByLabelText("Reward name"), "Free tea for a month");
  userEvent.type(screen.getByLabelText("Minimum amount (৳)"), "500");
  userEvent.type(screen.getByLabelText("Quantity (optional)"), "20");
  userEvent.click(screen.getByRole("button", { name: "Publish campaign" }));

  await screen.findByRole("heading", { name: "Rahim's Tea Stall" });
  expect(screen.getByText("Free tea for a month")).toBeInTheDocument();
  expect(screen.getByText("20 of 20 left")).toBeInTheDocument();
});

test("the interface can switch to Bangla and back", async () => {
  renderAt("/");
  await screen.findByText("Mishu's Pottery Studio");
  userEvent.click(screen.getByRole("button", { name: /View in Bangla/ }));

  expect(await screen.findByRole("heading", { name: /ছোট ব্যবসা/ })).toBeInTheDocument();
  expect(screen.getAllByText("হস্তশিল্প").length).toBeGreaterThan(0);
  expect(screen.getByText("৳২,৭৯,০০০")).toBeInTheDocument();
  expect(document.documentElement.getAttribute("lang")).toBe("bn");
  expect(window.localStorage.getItem("jogaar:lang")).toBe("bn");

  userEvent.click(screen.getByRole("button", { name: /View in English/ }));
  expect(await screen.findByRole("heading", { name: /Small businesses/ })).toBeInTheDocument();
});

const STALL = {
  title: "Rahim's Tea Stall",
  category: "Food & Drink",
  location: "Mirpur, Dhaka",
  goal: 50000,
  durationDays: 30,
  summary: "A clean, friendly tea stall near the stadium.",
  story: "I have sold tea from a flask for five years. A proper stall with a stove and seating will let me serve more customers.",
  image: "cafe",
  rewards: [],
};
const account = (name, email) => api.register({ name, email, password: "Secret123", contact: "" });
const signInAs = (session) => window.localStorage.setItem("jogaar:token", session.token);

test("owners get notified about new contributions", async () => {
  await account("Admin Person", "admin@example.com");
  const owner = await account("Owner Person", "owner@example.com");
  const stall = await api.createCampaign(owner.token, STALL);
  const backer = await account("Backer Person", "backer@example.com");
  await api.pledge(backer.token, stall.id, { amount: 1000, method: "bKash" });

  signInAs(owner);
  renderAt("/");
  const bell = await screen.findByRole("button", { name: "Notifications (1 unread)" });
  fireEvent.click(bell);
  expect(await screen.findByText("Backer Person backed Rahim's Tea Stall with ৳1,000.")).toBeInTheDocument();
  await waitFor(() => expect(screen.getByRole("button", { name: "Notifications" })).toBeInTheDocument());
});

test("a user can report a campaign", async () => {
  renderAt("/register");
  await signUp();
  await screen.findByRole("heading", { name: "Hi, Rahim" });
  userEvent.click(screen.getAllByRole("link", { name: "Discover" })[0]);
  userEvent.click(await screen.findByText("Retro Cafe"));
  userEvent.click(await screen.findByRole("button", { name: "Report" }));

  const dialog = await screen.findByRole("dialog", { name: "Report this campaign" });
  userEvent.click(screen.getByRole("button", { name: "Send report" }));
  expect(await screen.findByText("Choose a reason.")).toBeInTheDocument();
  userEvent.click(screen.getByLabelText("Fraud or a fake campaign"));
  userEvent.type(screen.getByLabelText("Details (optional)"), "Photos look copied");
  userEvent.click(screen.getByRole("button", { name: "Send report" }));
  expect(await screen.findByText("Thanks — our team will review your report.")).toBeInTheDocument();
  expect(dialog).not.toBeInTheDocument();
});

test("admins can verify campaigns and act on reports", async () => {
  window.confirm = jest.fn(() => true);
  const admin = await account("Admin Person", "admin@example.com");
  const owner = await account("Owner Person", "owner@example.com");
  const stall = await api.createCampaign(owner.token, STALL);
  const reporter = await account("Reporter Person", "reporter@example.com");
  await api.report(reporter.token, { targetType: "campaign", targetId: stall.id, reason: "spam", details: "Duplicate" });
  expect(admin.user.isAdmin).toBe(true);
  expect(owner.user.isAdmin).toBe(false);

  signInAs(admin);
  renderAt("/admin");
  expect(await screen.findByText("Campaign reported")).toBeInTheDocument();
  expect(screen.getByText("Reported by Reporter Person", { exact: false })).toBeInTheDocument();
  userEvent.click(screen.getByRole("button", { name: "Hide campaign" }));
  expect(await screen.findByText("No open reports. Nice and quiet.")).toBeInTheDocument();

  userEvent.click(screen.getByRole("tab", { name: "Campaigns" }));
  userEvent.click(screen.getByRole("button", { name: "Hidden" }));
  expect(await screen.findByText("Rahim's Tea Stall")).toBeInTheDocument();
  userEvent.click(screen.getByRole("button", { name: /Verify/ }));
  await screen.findByText("Saved.");

  // The hidden campaign is gone from the public list, and the owner was told.
  expect((await api.listCampaigns()).some((c) => c.id === stall.id)).toBe(false);
  const notes = await api.getNotifications(owner.token);
  expect(notes.items.map((n) => n.type).sort()).toEqual(["hidden", "verified"]);
});

test("non-admins are sent away from the admin page", async () => {
  await account("Admin Person", "admin@example.com");
  const someone = await account("Someone Else", "someone@example.com");
  signInAs(someone);
  renderAt("/admin");
  expect(await screen.findByRole("heading", { name: "Hi, Someone" })).toBeInTheDocument();
});
