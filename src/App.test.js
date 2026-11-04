import React from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import "@testing-library/jest-dom";
import App from "./App";
import { AuthProvider } from "./context/AuthContext";
import { resetLocalData } from "./api/client";

function renderAt(path) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <AuthProvider>
        <App />
      </AuthProvider>
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
  expect(screen.getByText("“Good luck!”")).toBeInTheDocument();
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
