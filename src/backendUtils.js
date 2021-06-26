/**
 * Contains various utility functions for fetching, parsing or manipulating
 * backend data. Divided by page.
 */

import { db } from "./firebase";

const MONTHS = {
    0: "Jan",
    1: "Feb",
    2: "Mar",
    3: "Apr",
    4: "May",
    5: "Jun",
    6: "Jul",
    7: "Aug",
    8: "Sep",
    9: "Oct",
    10: "Nov",
    11: "Dec",
};

const DATE_MAP = {
    Jan: 0,
    Feb: 1,
    Mar: 2,
    Apr: 3,
    May: 4,
    Jun: 5,
    Jul: 6,
    Aug: 7,
    Sep: 8,
    Oct: 9,
    Nov: 10,
    Dec: 11,
};

// * UTILITY FUNCTIONS

/**
 * Converts a date object to an end-user friendly string, such as Jun '21.
 *
 * @param {Date} dateObj The date object to be converted to a string
 * @returns Readable date string, e.g. Jun '21
 */
export function dateToDateString(dateObj) {
    const month = MONTHS[dateObj.getMonth()];
    const year = (dateObj.getFullYear() % 100).toString();
    return `${month} '${year}`;
}

/**
 * Converts a date string to a JavaScript Date object.
 *
 * @param {string} str Date string to be converted
 * @returns Date object
 */
export function dateStringToDateObject(str) {
    const month = DATE_MAP[str.slice(0, 3)];
    const year = parseInt(str.slice(5, 7)) + 2000;
    return new Date(year, month);
}

/**
 * Returns the number of months that has passed since the given date string.
 * Days are ignored, i.e. 31 May and 1 June are considered 1 month apart.
 *
 * @param {string} str The date string input
 * @returns Number of months that have passed. Negative if the date string is
 *          in the future.
 */
export function monthsSinceDateString(str) {
    const past = dateStringToDateObject(str);
    const current = new Date();
    const current_months = current.getFullYear() * 12 + current.getMonth();
    const past_months = past.getFullYear() * 12 + past.getMonth();
    return current_months - past_months;
}

export function nextDateString(str, delta = 1) {
    const prevDate = dateStringToDateObject(str);
    return dateToDateString(
        new Date(prevDate.getFullYear(), prevDate.getMonth() + delta)
    );
}

export function getLastTimeOfMonth(str) {
    const date = dateStringToDateObject(nextDateString(str));
    return new Date(
        date.getFullYear(),
        date.getMonth(),
        date.getDate(),
        date.getHours(),
        date.getMinutes(),
        date.getSeconds(),
        date.getMilliseconds() - 1
    );
}

// * DASHBOARD

/**
 * Returns an array of objects. Each object has a name, which is either Needs,
 * Wants or Unexpected, and a value which is the sum of all expenses of each
 * category for that particular month.
 *
 * @param {*} firestoreData The document object to be retrieved from Firestore
 * @param {*} monthsAgo     The number of months to go back from the current
 *                          month. Default is 0, which is the current month
 * @returns                 An array of objects
 */
export function dashboardPieData(firestoreData, monthsAgo = 0) {
    const thisMonthTransactions =
        firestoreData.monthArr[firestoreData.monthArr.length - 1 - monthsAgo]
            .transactions;

    function reducer(accumulator, current) {
        // Note that expenses are negative in value
        switch (current.type) {
            case "Need":
                accumulator[0].value -= current.value;
                break;
            case "Want":
                accumulator[1].value -= current.value;
                break;
            case "Unexpected":
                accumulator[2].value -= current.value;
                break;
            default:
                break;
        }
        return accumulator;
    }
    const data = thisMonthTransactions.reduce(reducer, [
        { name: "Needs", value: 0 },
        { name: "Wants", value: 0 },
        { name: "Unexpected", value: 0 },
        { name: "Total", value: 0 },
    ]);
    data[3].value = data[0].value + data[1].value + data[2].value;
    return data;
}

export function dashboardBarData(firestoreData) {
    const monthlyBalance = firestoreData.monthArr.map((obj) => {
        return {
            id: obj.id,
            value: obj.balance,
            date: obj.date,
        };
    });
    return monthlyBalance.reverse();
}

// * ADD EXPENSE / TRANSACTION

export function updateBalance(currentUser, delta, monthsAgo = 0) {
    const isBetween = (num, start, end) => num >= start && num <= end;
    var docRef = db.collection("users").doc(currentUser.uid);
    docRef.get().then((doc) => {
        let monthArr = doc.data().monthArr;
        const endIndex = monthArr.length - 1;
        const startIndex = endIndex - monthsAgo;
        monthArr = monthArr.map((obj) =>
            isBetween(obj.id, startIndex, endIndex)
                ? { ...obj, balance: obj.balance + delta }
                : obj
        );
        console.log(monthArr);
        docRef.update({
            monthArr: monthArr,
        });
    });
}

/**
 * Returns a Promise that ensures monthArr contains objects for all months up
 * to the current month and adds income and subscription amounts to
 * transactions list for that month.
 */

// ! Must be updated for any further database changes.
export async function updateDatabase(currentUser) {
    var docRef = db.collection("users").doc(currentUser.uid);
    return await docRef.get().then((doc) => {
        let monthArr = doc.data().monthArr;
        let latestObj = handleIncomeAndSubscriptions(
            monthArr[monthArr.length - 1]
        );
        let dateString = latestObj.date;
        const numOfMissingMonths = monthsSinceDateString(dateString);
        for (let i = 0; i < numOfMissingMonths; i++) {
            dateString = nextDateString(dateString);
            const monthObj = {
                ...latestObj,
                date: dateString,
                id: latestObj.id + i + 1,
                transactions: [],
                isIncomeAdded: false,
                isSubscriptionAdded: false,
            };
            latestObj = handleIncomeAndSubscriptions(monthObj);
            monthArr.push(latestObj);
        }
        docRef.update({
            monthArr: monthArr,
        });
    });
}

export function handleIncomeAndSubscriptions(monthObj) {
    return handleSubscriptions(handleIncome(monthObj));
}

export function handleIncome(monthObj) {
    if (
        monthsSinceDateString(monthObj.date) > 0 &&
        !monthObj.isIncomeAdded &&
        monthObj.income > 0
    ) {
        console.log("add income");
        monthObj.transactions.push({
            date: getLastTimeOfMonth(monthObj.date),
            description: `${monthObj.date} income`,
            type: "Money In",
            value: monthObj.income,
        });
        monthObj.balance += monthObj.income;
        monthObj.isIncomeAdded = true;
        return monthObj;
    } else if (
        // no income
        monthsSinceDateString(monthObj.date) > 0 &&
        !monthObj.isIncomeAdded
    ) {
        monthObj.isIncomeAdded = true;
    }
    return monthObj;
}

export function handleSubscriptions(monthObj) {
    // ! Assumes subscription amount in database is negative
    if (
        monthsSinceDateString(monthObj.date) > 0 &&
        !monthObj.isSubscriptionAdded &&
        monthObj.subscriptionAmount > 0
    ) {
        monthObj.transactions.push({
            date: getLastTimeOfMonth(monthObj.date),
            description: `${monthObj.date} subscriptions`,
            type: "Subscription",
            value: monthObj.subscriptionAmount,
        });
        monthObj.balance += monthObj.subscriptionAmount;
        monthObj.isSubscriptionAdded = true;
        return monthObj;
    } else if (
        // no subscriptions
        monthsSinceDateString(monthObj.date) > 0 &&
        !monthObj.isSubscriptionAdded
    ) {
        monthObj.isSubscriptionAdded = true;
    }
    return monthObj;
}
