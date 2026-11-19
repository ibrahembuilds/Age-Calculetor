// ---------------------------------------------------------------------------
// Age Calculator
// Flow: user types DD/MM/YYYY -> click Calculate -> validate -> show the
// age breakdown, extra stats, and a live ticking timer.
// ---------------------------------------------------------------------------

// ----- DOM references (looked up once, reused everywhere) -----
const birthDateInput = document.getElementById('birthDate');
const calculateBtn = document.getElementById('calculateBtn');
const clearBtn = document.getElementById('clearBtn');
const resultEl = document.getElementById('result');   // message box (success / error)
const statsEl = document.getElementById('stats');     // extra stats panel
const timerEl = document.getElementById('timer');     // live timer panel

// ----- State -----
let timerInterval;            // id returned by setInterval, so we can cancel it
let currentBirthDate = null;  // last valid birth date; lets the timer resume when the tab is visible again

// ----- Event wiring -----
calculateBtn.addEventListener('click', handleCalculation);
clearBtn.addEventListener('click', clearAll);
birthDateInput.addEventListener('input', formatDateInput); // auto-inserts the "/" separators while typing

// Pause the timer while the tab is hidden (saves CPU/battery) and
// resume it when the user comes back, if a valid date was already calculated.
document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
        stopTimer();
    } else if (currentBirthDate) {
        startTimer(currentBirthDate);
    }
});

/**
 * Click handler for "Calculate".
 * Validates the input, then renders the result, stats and timer.
 * The button shows a short "Calculating..." state and is disabled
 * to prevent double clicks while the (artificial) delay runs.
 */
function handleCalculation() {
    const originalText = calculateBtn.textContent;
    calculateBtn.textContent = 'Calculating...';
    calculateBtn.disabled = true;

    // 280ms delay is purely cosmetic: it gives the user visual feedback.
    setTimeout(() => {
        const birthDate = parseBirthDate(birthDateInput.value);

        // Invalid format or impossible date (e.g. 31/02/2000)
        if (!birthDate) {
            showResult('Please enter a valid date in DD/MM/YYYY format.', false);
            hideDetails();
            calculateBtn.textContent = originalText;
            calculateBtn.disabled = false;
            return;
        }

        // A person can't be born in the future
        const now = new Date();
        if (birthDate > now) {
            showResult('Birth date cannot be in the future.', false);
            hideDetails();
            calculateBtn.textContent = originalText;
            calculateBtn.disabled = false;
            return;
        }

        // Valid input: remember it, compute and display everything
        currentBirthDate = birthDate;
        const age = getAgeBreakdown(birthDate, now);

        updateStats(age, birthDate, now);
        showResult(`You are <strong>${age.years}</strong> years, <strong>${age.months}</strong> months, and <strong>${age.days}</strong> days old.`, true);
        startTimer(birthDate);

        calculateBtn.textContent = originalText;
        calculateBtn.disabled = false;
    }, 280);
}

/**
 * Parses a "DD/MM/YYYY" string into a Date at local midnight.
 * @param {string} dateStr - raw text from the input field
 * @returns {Date|null} the Date, or null if the text is not a real calendar date
 */
function parseBirthDate(dateStr) {
    // Strict format check: day 01-31, month 01-12, 4-digit year
    const regex = /^(0[1-9]|[12][0-9]|3[01])\/(0[1-9]|1[0-2])\/(\d{4})$/;
    const match = dateStr.match(regex);
    if (!match) return null;

    const day = Number(match[1]);
    const month = Number(match[2]);
    const year = Number(match[3]);

    // Months are 0-based in JS Date, hence month - 1
    const date = new Date(year, month - 1, day);

    // The regex allows days like 31/02, and JS silently rolls those over
    // into the next month (31 Feb -> 2/3 Mar). If any part changed, the
    // original date didn't exist, so reject it.
    if (
        date.getFullYear() !== year ||
        date.getMonth() !== month - 1 ||
        date.getDate() !== day
    ) {
        return null;
    }

    date.setHours(0, 0, 0, 0); // normalise to midnight (start of the birth day)
    return date;
}

/**
 * Calendar-accurate difference between two dates, as years / months / days.
 * Works by subtracting field by field and "borrowing" when a field goes negative,
 * the same way you do manual subtraction.
 * @param {Date} fromDate - birth date
 * @param {Date} toDate   - usually "now"
 * @returns {{years:number, months:number, days:number}}
 */
function getAgeBreakdown(fromDate, toDate) {
    let years = toDate.getFullYear() - fromDate.getFullYear();
    let months = toDate.getMonth() - fromDate.getMonth();
    let days = toDate.getDate() - fromDate.getDate();

    // Borrow a month: the day-of-month hasn't been reached yet this month.
    if (days < 0) {
        months -= 1;
        // new Date(year, month, 0) = last day of the PREVIOUS month,
        // i.e. how many days we are borrowing.
        const previousMonthDays = new Date(toDate.getFullYear(), toDate.getMonth(), 0).getDate();
        days += previousMonthDays;
    }

    // Borrow a year: the birth month hasn't been reached yet this year.
    if (months < 0) {
        years -= 1;
        months += 12;
    }

    return { years, months, days };
}

/**
 * Fills the "extra stats" panel: years/months/days, total days lived,
 * and the next birthday.
 */
function updateStats(age, birthDate, now) {
    const msDiff = now - birthDate;
    // milliseconds -> whole days (24h * 60min * 60s * 1000ms)
    const totalDays = Math.floor(msDiff / (24 * 60 * 60 * 1000));

    document.getElementById('statYears').textContent = String(age.years);
    document.getElementById('statMonths').textContent = String(age.months);
    document.getElementById('statDays').textContent = String(age.days);
    document.getElementById('statTotalDays').textContent = totalDays.toLocaleString(); // adds thousands separators
    document.getElementById('nextBirthday').textContent = getNextBirthdayText(birthDate, now);

    statsEl.hidden = false;
}

/**
 * Builds the "Next birthday" text, e.g. "Sat, Mar 14, 2026 (42 days left)".
 */
function getNextBirthdayText(birthDate, now) {
    const thisYear = now.getFullYear();
    // Same day/month as the birth date, but in the current year
    let nextBirthday = new Date(thisYear, birthDate.getMonth(), birthDate.getDate());

    // Already passed this year -> the next one is next year
    if (nextBirthday < now) {
        nextBirthday = new Date(thisYear + 1, birthDate.getMonth(), birthDate.getDate());
    }

    const diffMs = nextBirthday - now;
    // ceil: a partial day still counts as "1 day left"
    const diffDays = Math.ceil(diffMs / (24 * 60 * 60 * 1000));

    // Human-friendly date format (en-US, short weekday/month)
    const formatter = new Intl.DateTimeFormat('en-US', {
        weekday: 'short',
        year: 'numeric',
        month: 'short',
        day: 'numeric'
    });

    // Singular/plural handling: "1 day left" vs "2 days left"
    return `${formatter.format(nextBirthday)} (${diffDays} day${diffDays === 1 ? '' : 's'} left)`;
}

/**
 * Starts the live timer that refreshes every second.
 * Always stops any previous timer first so two intervals never run at once.
 */
function startTimer(birthDate) {
    stopTimer();
    timerEl.hidden = false;

    timerInterval = setInterval(() => {
        const now = new Date();
        const elapsed = now - birthDate; // total ms lived

        // Break elapsed time down into seconds/minutes/hours/days.
        // Each "total" is the whole count; the "%" gives the part that
        // shows on the clock (e.g. 75 minutes -> 1h 15m).
        const totalSeconds = Math.floor(elapsed / 1000);
        const seconds = totalSeconds % 60;
        const totalMinutes = Math.floor(totalSeconds / 60);
        const minutes = totalMinutes % 60;
        const totalHours = Math.floor(totalMinutes / 60);
        const hours = totalHours % 24;
        const totalDays = Math.floor(totalHours / 24);

        // Years/months here are APPROXIMATIONS using average lengths
        // (365.25 days per year, 30.44 days per month), so they can differ
        // by a day or so from the exact calendar breakdown shown above.
        const years = Math.floor(totalDays / 365.25);
        const remainingDaysAfterYears = Math.floor(totalDays - years * 365.25);
        const months = Math.floor(remainingDaysAfterYears / 30.44);
        const days = Math.floor(remainingDaysAfterYears - months * 30.44);

        document.getElementById('years').textContent = padNumber(years);
        document.getElementById('months').textContent = padNumber(months);
        document.getElementById('days').textContent = padNumber(days);
        document.getElementById('hours').textContent = padNumber(hours);
        document.getElementById('minutes').textContent = padNumber(minutes);
        document.getElementById('seconds').textContent = padNumber(seconds);
    }, 1000);
}

/** Stops the live timer (if running) and hides its panel. */
function stopTimer() {
    if (timerInterval) {
        clearInterval(timerInterval);
        timerInterval = null;
    }
    timerEl.hidden = true;
}

/** Hides the stats panel and the timer (used on errors and on clear). */
function hideDetails() {
    statsEl.hidden = true;
    stopTimer();
}

/**
 * Shows a message in the result box.
 * @param {string} message - HTML string (only ever our own text, never raw user input)
 * @param {boolean} success - true -> success styling, false -> error styling
 */
function showResult(message, success) {
    resultEl.className = success ? 'result show' : 'result error';
    resultEl.innerHTML = message;
}

/** Click handler for "Clear": resets the input, state and all output panels. */
function clearAll() {
    birthDateInput.value = '';
    currentBirthDate = null;
    resultEl.className = 'result';
    resultEl.textContent = '';
    hideDetails();
    birthDateInput.focus(); // ready for the next entry
}

/** Zero-pads to 2 digits: 5 -> "05" (for the clock-style display). */
function padNumber(num) {
    return String(num).padStart(2, '0');
}

/**
 * Input handler: formats typed digits as DD/MM/YYYY on the fly.
 * "15082000" -> "15/08/2000". Non-digits are stripped, max 8 digits kept.
 */
function formatDateInput(event) {
    // Keep digits only, cap at 8 (DDMMYYYY)
    let value = event.target.value.replace(/\D/g, '').slice(0, 8);

    if (value.length > 4) {
        // DD/MM/YYYY
        value = `${value.slice(0, 2)}/${value.slice(2, 4)}/${value.slice(4)}`;
    } else if (value.length > 2) {
        // DD/MM
        value = `${value.slice(0, 2)}/${value.slice(2)}`;
    }

    event.target.value = value;
}
