# Prompts.md — Dev-Detective Sprint 03

This file documents the AI prompts I used during development as a learning tool and pair-programmer. I used Claude/ChatGPT to understand concepts, debug issues, and get unstuck.

---

## 1. Understanding Async/Await basics

I was confused about why we need `async` and `await` at all when `fetch` already works.

**My prompt:**
> "explain async await to me like im a beginner, why cant i just use fetch normally without await"

**What I learned:**
`fetch()` returns a Promise — meaning the data isn't ready yet. Without `await`, your code keeps running before the data arrives, so you'd get `undefined`. `await` tells JavaScript to pause and wait for the response before moving on. I then wrote the `fetchUser()` function myself based on this.

---

## 2. Getting stuck on the 404 error handling

My app was crashing when I searched a username that didn't exist. The page just broke.

**My prompt:**
> "my fetch request crashes when github returns 404, how do i catch that error and show a message instead of breaking the app"

**What I learned:**
`fetch()` doesn't automatically throw on 404 — I had to manually check `response.ok` and throw my own error. Then wrap the call in `try/catch` to handle it. This is what I implemented in the error state section.

---

## 3. Chaining two API calls

Phase 2 required me to use the `repos_url` from the first API response to make a second fetch. I wasn't sure how to do two async calls one after another.

**My prompt:**
> "how do i use the result of one fetch call as the input for a second fetch call in javascript"

**What I learned:**
You just `await` the first call, store the result, then use a value from it in the second `await` call. Simple sequential chaining. I used `userData.repos_url` from the profile response and passed it into `fetchRepos()`.

---

## 4. Formatting the ISO date

The GitHub API returns dates like `2021-03-15T10:30:00Z` which looks ugly on screen.

**My prompt:**
> "how do i convert an ISO date string like 2021-03-15T10:30:00Z into something readable like 15 Mar 2021 in javascript"

**What I learned:**
JavaScript's built-in `Date` object plus `toLocaleDateString()` handles this cleanly. I wrote the `fmtDate()` utility function myself after understanding how it works.

---

## 5. Promise.all for Battle Mode

I needed to fetch two users at the same time instead of one after the other.

**My prompt:**
> "whats the difference between doing two awaits one after another vs Promise.all, when should i use Promise.all"

**What I learned:**
Two sequential `await` calls means the second one only starts after the first finishes — slow. `Promise.all()` fires both at the same time and waits for both to finish — faster. Made sense to use it in Battle Mode since the two fetches are independent of each other.

---

## 6. Calculating total stars with reduce

Phase 3 needed me to loop through all repos and add up the `stargazers_count`.

**My prompt:**
> "how does array reduce work in javascript, i want to add up a specific property from each object in an array"

**What I learned:**
`reduce()` takes an accumulator and adds to it on each loop iteration. I used it to sum up `stargazers_count` across all repos. Wrote the `calcStars()` function myself after understanding the pattern.

---

## 7. Handling a tie in Battle Mode

Both users having equal stars was showing both as "winner" which was wrong.

**My prompt:**
> "in my battle mode both users show as winner when they have equal stars, how do i add a tie condition"

**What I learned:**
I needed to check `stars1 === stars2` first before deciding winner or loser. Used a ternary chain — if equal assign `'tie'`, else compare normally. I also added a separate yellow/gold UI style for the tie verdict so it is visually distinct from winner (blue) and loser (red).

---

## 8. Independent 404 handling in Battle Mode

If one username did not exist in Battle Mode, the whole battle was cancelled and neither card showed.

**My prompt:**
> "in my battle mode if one user is not found i want to show 404 error only for that side and still show the other users profile card, not cancel the whole battle"

**What I learned:**
The problem was using a single `try/catch` around `Promise.all()` — if either fetch failed, the whole thing threw. The fix was to create a `fetchBattleSide()` helper that wraps each fetch in its own `try/catch` and returns `{ ok: true }` or `{ ok: false }` instead of throwing. Then `Promise.all()` always resolves and I render each side independently based on the `ok` flag.

---

## 9. Persisting data across page refresh with localStorage

After refreshing the page, the search results and inputs were cleared.

**My prompt:**
> "how do i save my search results so they still show after the user refreshes the page in javascript"

**What I learned:**
`localStorage` stores key-value pairs that survive page refreshes. I used `localStorage.setItem()` to save the last search data as a JSON string after every successful search, and `localStorage.getItem()` on page load inside a `DOMContentLoaded` listener to restore it. I also saved the theme and mode so those persist too.

---

## 10. Search history suggestions dropdown

I wanted the input to show previously searched usernames as suggestions when clicked.

**My prompt:**
> "how do i build a custom suggestions dropdown in javascript that shows previous search history from localStorage when the user clicks an input field"

**What I learned:**
I used `focus` and `input` events on the text field to show a dynamically created dropdown div populated from a `dd_history` array in localStorage. `mousedown` fires before `blur`, so clicking a suggestion fills the input before the dropdown closes. I also added a filter so typing narrows the suggestions down.

---

## 11. Removing a suggestion permanently

Clicking the X on a suggestion removed it visually but it came back after refresh.

**My prompt:**
> "i remove an item from my suggestions dropdown but it comes back after refresh, how do i make the removal permanent"

**What I learned:**
I was re-rendering the dropdown from localStorage but not actually updating the stored array first. The fix was to call `removeFromHistory()` which filters the array and immediately calls `localStorage.setItem()` to save the updated list before re-rendering the dropdown. Now the removal persists across refreshes.

---

## 12. Close button on profile card

There was no way to dismiss a profile card without refreshing the page.

**My prompt:**
> "how do i add a close or dismiss button on a card in javascript that removes it from the dom and also clears the saved localStorage data"

**What I learned:**
I added a `closeCard()` function that resets the output div back to the empty state, clears both input fields, and calls `localStorage.removeItem('dd_last')` so the card does not restore on next refresh. The button is positioned absolutely in the top-right corner of the card using CSS `position: relative` on the card and `position: absolute` on the button.

---
