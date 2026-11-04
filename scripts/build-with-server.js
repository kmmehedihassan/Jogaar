// Builds the website so it talks to the Jogaar server on the same origin (/api).
process.env.REACT_APP_API_URL = process.env.REACT_APP_API_URL || "/api";
require("react-scripts/scripts/build");
