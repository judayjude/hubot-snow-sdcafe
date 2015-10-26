var cheerio = require('cheerio');

module.exports = (function () {
    function handler(robot) {
        robot.respond(/what's for lunch/i, sayLunch);
    }

    function sayLunch(msg) {
        var cafeMenu = fetchCafeMenu();
        msg.send(cafeMenu);
    }

    function fetchCafeMenu() {
        var thisMonday = getThisMonday();
        var dayOfWorkWeek = getDayOfWorkWeek();
        var menuPath = "9PEU5T~" + thisMonday + "/$file/day" +
            dayOfWorkWeek + ".htm";
        var todaysMenuUrl = "http://dining.guckenheimer.com/clients/servicenowsd/fss/fss.nsf/weeklyMenuLaunch/" +
            menuPath;

        robot.http(todaysMenuUrl).get(function (err, res, body) {
            var menuDom = cheerio.load(body);
            return menuDom(".center_text").text();
        });
    }

    function getThisMonday() {
        var today = new Date();
        var month = leadingZero(today.getMonth + 1);
        var dayOfMonth = today.getDate();
        var daysSinceMonday = today.getDay() - 1;
        var mondayThisWeek = leadingZero(dayOfMonth - daysSinceMonday);
        var year = today.getFullYear();
        return month + "-" + mondayThisWeek + "-" + year;
    }

    function leadingZero(base) {
        return ("000" + base).substr(-2);
    }

    function getDayOfWorkWeek() {
        return new Date().getDay();
    }

    return handler;
}());