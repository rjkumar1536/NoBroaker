require('chromedriver');
require('../app');
const chai = require('chai');
const expect = chai.expect;
const {Builder} = require('selenium-webdriver');
const chrome = require('selenium-webdriver/chrome');
const options = new chrome.Options().addArguments(
    'headless'
);
const {
    IDMAP,
    getElementById,
    validateCards,
    setupStatementView,
    clickElement,
    valueInRange,
    getRandomUser
} = require('./utils');
let driver;


describe('user monthly statements test', function () {
    this.timeout(100000);

    before(function (done) {
        driver = new Builder()
            .forBrowser('chrome')
            .setChromeOptions(options)
            .build();
        driver.get('http://localhost:8001')
            .then(() => {
                done();
            });
    });

    after(function () {
        driver.quit();
    });


    beforeEach(async function () {
        driver.navigate().refresh();
    });

    it('Should render the filter view initially', async function () {
        let filterView = await getElementById(driver, IDMAP.FILTER_VIEW);
        expect(await filterView.isDisplayed()).to.be.true;
        let profileView = await getElementById(driver, IDMAP.STATEMENTS_VIEW);
        expect(await profileView.isDisplayed()).to.be.false;
        let loaderView = await getElementById(driver, IDMAP.LOADER_VIEW);
        expect(await loaderView.isDisplayed()).to.be.false;
    });

    it('Should not start fetching the data if the disabled value is selected in the select menu', async function () {
        let loaderView = await getElementById(driver, IDMAP.LOADER_VIEW);
        expect(await loaderView.isDisplayed()).to.be.false;

        let submitBtn = await getElementById(driver, IDMAP.SUBMIT_BUTTON);
        await clickElement(submitBtn);

        expect(await loaderView.isDisplayed()).to.be.false;
    });

    it('Should show the loader when a valid value is selected from the select dropdown', async function () {
        let selectDropdown = await getElementById(driver, IDMAP.USER_SELECT);
        await selectDropdown.sendKeys(getRandomUser());

        let loaderView = await getElementById(driver, IDMAP.LOADER_VIEW);
        expect(await loaderView.isDisplayed()).to.be.false;

        let submitBtn = await getElementById(driver, IDMAP.SUBMIT_BUTTON);
        await clickElement(submitBtn);

        expect(await loaderView.isDisplayed()).to.be.true;

    });

    it('Should render the statement view with user data when the data is fetched', async function () {
        const {name, balance} = await setupStatementView(driver);

        let userName = await getElementById(driver, IDMAP.USER_NAME);
        expect(await userName.getText()).to.eq(name);

        let userBalance = await getElementById(driver, IDMAP.USER_BALANCE);
        valueInRange(await userBalance.getText(), balance - 10, balance + 10)

    });


    it('Should render the statement cards properly on the screen', async function () {
        const {name, balance, monthly} = await setupStatementView(driver);
        await validateCards(driver, {name, monthly, balance})
    });

    it('Should fetch and render monthly statements when the selected user changes', async function () {
        let result = await setupStatementView(driver);
        await validateCards(driver, {name: result.name, balance: result.balance, monthly: result.monthly});

        result = await setupStatementView(driver);
        await validateCards(driver, {name: result.name, balance: result.balance, monthly: result.monthly});
    });
});
