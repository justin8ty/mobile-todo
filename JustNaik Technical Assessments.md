# React Native To Do Application

*Junior Technical Assessment*

## Objective

Build a simple React Native To Do application that demonstrates mobile development fundamentals and API integration. Users should be able to view, add, complete, and delete tasks through a clean mobile interface.

## Functional Requirements

- Fetch the first 10 tasks from GET /todos?_limit=10 and display them in a list with their titles and completion states.
- Allow users to toggle a task between completed and incomplete locally.
- Provide a form to add a task through POST /todos. Submit the task title, completed set to false, and a userId such as 1.
- After a successful POST response, immediately add the new task to the displayed list without reloading the screen.
- Allow users to delete tasks locally.
- Show a loading indicator while fetching tasks, an error message with a retry option when fetching fails, and an empty state when no tasks remain.
- Reject empty or whitespace-only task titles. Disable submission while saving and show an error message if adding a task fails.

## Technical Specifications

Use React Native with Expo, functional components, and React hooks. JavaScript or TypeScript is acceptable. Use fetch or Axios for API requests. No backend implementation or authentication is required.

Use the JSONPlaceholder API at https://jsonplaceholder.typicode.com. API writes are simulated and do not persist. Completion changes and deletions are local; fetching again may restore the original API data.

## Deliverables and Estimated Effort

- Complete source code in a GitHub repository and a README with setup and usage instructions.
- Optional bonus: save tasks locally using AsyncStorage so they remain after restarting the app.

## Evaluation Focus

Working features, correct API handling, clear loading and error states, readable code, sensible component structure, and basic mobile usability.
