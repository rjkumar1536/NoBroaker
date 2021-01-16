const API_URL = 'https://jsonmock.hackerrank.com';
const {By, until} = require('selenium-webdriver');
const axios = require('axios');
const chai = require('chai');
const expect = chai.expect;
const Promise = require("bluebird");


const IDMAP = {
    FILTER_VIEW: 'filter-view',
    USER_SELECT: 'user-select',
    STATEMENTS_VIEW: 'statements-view',
    LOADER_VIEW: 'loader-view',
    SUBMIT_BUTTON: 'submit-btn',
    USER_NAME: 'user-name',
    USER_BALANCE: 'user-balance',
    MONTHLY_STATEMENTS: 'monthly-statements',
    STATEMENT_CARD: 'statement-card',
    MONTHLY_BALANCE: 'monthly-balance',
    MONTH_YEAR: 'month-year',
    MONTHLY_DEBIT: 'monthly-debit',
    MONTHLY_CREDIT: 'monthly-credit'
};

const getElementById = (driver, id) => {
    return driver.findElement(By.id(id))
};

const getElementsByClassName = (driver, className) => {
    return driver.findElements(By.className(className))
};

const getElementsByTagName = (driver, tagName) => {
    return driver.findElements(By.tagName(tagName))
};

const valueInRange = (value, min, max) => {
    if (typeof value === 'string') {
        const temp = value.replace(',', '').replace('$', '').replace(/Balance: |Credit: |Debit: /, '');
        value = parseInt(temp);
    }
    expect(value).to.be.gte(min || 0);
    expect(value).to.be.lte(max || 0);
};

const elementHasClass = async (element, className) => {
    const classString = await element.getAttribute("class");
    return classString.split(" ").includes(className)
};

const fetchRecords = (userId, page) => {
    return new Promise(((resolve, reject) => {
        axios(`${API_URL}/api/transactions?userId=${userId}&page=${page}`)
            .then(response => {
                resolve(response.data)
            })
            .catch(reject);
    }))
};

const clickElement = (node) => {
    try {
        return node.click();
    } catch (e) {
        if (e.name === 'StaleElementReferenceError') {
            return clickElement(node);
        }
        throw e;
    }
};

const setupStatementView = async (driver) => {
    let selectDropdown = await getElementById(driver, IDMAP.USER_SELECT);
    await selectDropdown.sendKeys(getRandomUser());

    let submitBtn = await getElementById(driver, IDMAP.SUBMIT_BUTTON);
    await clickElement(submitBtn);

    let loaderView = await getElementById(driver, IDMAP.LOADER_VIEW);
    expect(await loaderView.isDisplayed()).to.be.true;

    const userId = parseInt(await selectDropdown.getAttribute('value'));
    let response = await fetchRecords(userId, 1);
    response = await fetchPaginatedResults(userId, response);

    let statementsView = await getElementById(driver, IDMAP.STATEMENTS_VIEW);
    expect(await statementsView.isDisplayed()).to.be.true;


    let records = response.data
        .sort((a, b) => {
            return b.timestamp - a.timestamp;
        })
        .map(result => {
            result.month = getFormattedMonth(result.timestamp);
            return result;
        });

    let grouped = groupBy(records, 'month');
    let {balance} = calculateBalance(records);
    let result = {
        balance,
        monthly: [],
        name: records[0].userName
    };
    Object.keys(grouped).forEach(key => {
        const results = grouped[key];
        const {balance, debitAmount, creditAmount} = calculateBalance(results);
        result.monthly.push({
            balance,
            debitAmount,
            creditAmount,
            month: key
        })
    });

    return result
};

const validateCards = async (driver, {name, balance, monthly}) => {
    let userName = await getElementById(driver, IDMAP.USER_NAME);
    expect(await userName.getText()).to.eq(name);

    let userBalance = await getElementById(driver, IDMAP.USER_BALANCE);
    valueInRange(await userBalance.getText(), balance - 10, balance + 10);

    const monthlyStatements = await getElementById(driver, IDMAP.MONTHLY_STATEMENTS);
    let statementCards = await getElementsByClassName(monthlyStatements, IDMAP.STATEMENT_CARD);
    expect(statementCards.length).to.eq(monthly.length);

    await Promise.map(statementCards, async (card, index) => {
        const monthData = monthly[index];
        const monthBalance = await getElementsByClassName(card, IDMAP.MONTHLY_BALANCE);
        valueInRange(await monthBalance[0].getText(), monthData.balance - 10, monthData.balance + 10);

        const monthYear = await getElementsByClassName(card, IDMAP.MONTH_YEAR);
        expect(await monthYear[0].getText()).to.eq(monthData.month);

        const monthCredit = await getElementsByClassName(card, IDMAP.MONTHLY_CREDIT);
        valueInRange(await monthCredit[0].getText(), monthData.creditAmount - 10, monthData.creditAmount + 10);

        const monthDebit = await getElementsByClassName(card, IDMAP.MONTHLY_DEBIT);
        valueInRange(await monthDebit[0].getText(), monthData.debitAmount - 10, monthData.debitAmount + 10);
    });
}

const calculateBalance = (results) => {
    let creditAmount = 0;
    let debitAmount = 0;
    const balance = results
        .reduce((acc, record) => {
            const amt = parseInt(record.amount.replace('$', '').replace(',', ''));
            if (record.txnType === 'debit') {
                acc -= amt;
                debitAmount += amt;
            } else {
                acc += amt;
                creditAmount += amt;
            }
            return acc;
        }, 0);

    return {balance, creditAmount, debitAmount};
};


const getFormattedMonth = (timestamp) => {
    const date = new Date(timestamp);
    let mm = date.getMonth() + 1;
    const yyyy = date.getFullYear();
    if (mm < 10) {
        mm = '0' + mm;
    }
    return mm + '-' + yyyy;
};

const groupBy = function (arrayData, key) {
    return arrayData.reduce(function (rv, x) {
        (rv[x[key]] = rv[x[key]] || []).push(x);
        return rv;
    }, {});
};

const fetchPaginatedResults = (userId, response) => {
    return new Promise(((resolve, reject) => {
        if (response.total_pages === 1) {
            resolve(response);
        } else {
            Promise
                .all(
                    new Array(response.total_pages - 1)
                        .fill(1)
                        .map((o, i) => fetchRecords(userId, i + 2))
                )
                .then(results => {
                    response.data = response.data.concat(results.reduce((acc, result) => acc.concat(result.data), []));
                    resolve(response);
                })
                .catch(reject)
        }
    }))
};

const getRandomUser = () => {
    const users = ['John Oliver', 'Bob Martin', 'Helena Fernandez', 'Francesco De Mello'];
    return users[Math.floor(Math.random() * (0 - 3 + 1) + 3)];
};

module.exports = {
    getElementById,
    getElementsByClassName,
    fetchRecords,
    setupStatementView,
    getRandomUser,
    IDMAP,
    valueInRange,
    validateCards,
    elementHasClass,
    clickElement
};
