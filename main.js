var cheerio = require('cheerio');

module.exports = (function () {
    function handler(robot) {
        robot.respond(/what'?s for lunch/i, fetchCafeMenu);
    }

    function fetchCafeMenu(msg) {
        var thisMonday = getThisMonday();
        var dayOfWorkWeek = getDayOfWorkWeek();
        var menuPath = "9PEU5T~" + thisMonday + "/$file/day" +
            dayOfWorkWeek + ".htm";
        var todaysMenuUrl = "http://dining.guckenheimer.com/clients/servicenowsd/fss/fss.nsf/weeklyMenuLaunch/" +
            menuPath;

        robot.http(todaysMenuUrl).get()(function (err, res, body) {
            if (res.statusCode != 200) {
                msg.send("Not sure what's for lunch, can't get menu :(");
            } else {
                var menuDom = cheerio.load(body);
                msg.send(menuDom(".center_text").text());
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