var cheerio = require('cheerio');
var htmlToText = require('html-to-text');

module.exports = (function () {
    function handler(robot) {
        robot.respond(/what'?s for lunch/i, fetchCafeMenu);
    }

    function fetchCafeMenu(msg) {
        console.log("Lunch request detected")
        var thisMonday = getThisMonday();
        var dayOfWorkWeek = getDayOfWorkWeek();
        var menuPath = "9PEU5T~" + thisMonday + "/$file/day" +
            dayOfWorkWeek + ".htm";
        var todaysMenuUrl = "http://dining.guckenheimer.com/clients/servicenowsd/fss/fss.nsf/weeklyMenuLaunch/" +
            menuPath;

        console.log("Using menu URL: " + todaysMenuUrl);
        robot.http(todaysMenuUrl).get()(function (err, res, body) {
            var menuDom, menuHtml, menuPlainText;
            if (res.statusCode != 200) {
                console.log("Made request, but status code is error: " + res.statusCode);
                msg.send("Not sure what's for lunch, can't get menu :(");
            } else {
                console.log("Made request, response status 200");

                menuDom = cheerio.load(body);
                menuHtml = menuDom("#center_text");

                console.log("Cheerio found menu element: " + !!menuHtml);
                console.log("Cheerio extracted html from menu element: " + menuHtml.html());

                menuPlainText = htmlToText.fromString(menuHtml.html() + "");
                console.log("Html-to-text massaged into plain text: " + menuPlainText)
                msg.send(menuPlainText);
            }
        });
    }

    function getThisMonday() {
        var today = new Date();
        var month = leadingZero(today.getMonth() + 1);
        var dayOfMonth = today.getDate();
        var daysSinceMonday = (today.getDay() + 7) % 8;
        var mondayThisWeek = leadingZero(dayOfMonth - daysSinceMonday);
        var year = today.getFullYear();
        return month + "-" + mondayThisWeek + "-" + year;
    }

    function leadingZero(base) {
        return ("000" + base).substr(-2);
    }

    function getDayOfWorkWeek() {
        var today = new Date();
        return (function dayOfWorkWeek(date) {
            var dayOfWeek = new Date().getDay();
            var friday = 5, monday = 1;
            return (dayOfWeek > friday || dayOfWeek < monday) ? friday : dayOfWeek;
        }(today));
    }

    return handler;
}());