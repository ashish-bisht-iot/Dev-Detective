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

## 3. Chaining two API calls (Phase 2)

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

## 5. Promise.all for Battle Mode (Phase 3)

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

## 7. Debugging a rate limit error (403)

At one point I was getting a 403 error from the GitHub API.

**My prompt:**
> "github api returning 403 forbidden, what does that mean and how do i fix it"
>
> 
