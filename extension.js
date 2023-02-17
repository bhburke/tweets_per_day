var tpd = (function () {
  var tpd = {}; // The object to be returned

  // Private variables
  var tweetBoxSelector = 'a[data-element-term="tweetStats"]',
    usernameSpanSelector = "span.username",
    hoursToKeepCache = 12,
    cache = {};

  // Private functions

  // Apply Tweets Per Day to a tweet box
  var applyToBox = function (tweetBox) {
    var username = tweetBox.attr("href").substring(1);
    getTweetsPerDay(username, function (tweetsPerDay) {
      modifyBox(tweetBox, tweetsPerDay);
    });
  };

  // Apply Tweets Per Day to a user span
  var applyToUsernameSpan = function (usernameSpan) {
    var username = usernameSpan.find("b").text();
    getTweetsPerDay(username, function (tweetsPerDay) {
      modifyUsernameSpan(usernameSpan, tweetsPerDay);
    });
  };

  // Get the number of tweets per day made by username, handle in callback
  var getTweetsPerDay = function (username, callback) {
    var userData = cache[username];
    if (dataIsFresh(userData)) {
      // Use cached user data
      tpd = calculateTweetsPerDay(userData);
      callback(tpd);
    } else {
      // Look up tweets
      makeApiCall(username, callback);
    }
  };

  // Is the cached data valid and recent?
  var dataIsFresh = function (userData) {
    return (
      userData &&
      userData.dateRetrieved &&
      age(userData.dateRetrieved) < 60 * 60 * 1000 * hoursToKeepCache
    );
  };

  // Take stored data about user and return their estimated tweets/day
  var calculateTweetsPerDay = function (userData) {
    var milliseconds = age(userData.lastTweetDate);
    var days = milliseconds / (1000 * 60 * 60 * 24);
    var numTweets = 20;

    var ratio = Math.round((numTweets / days) * 100) / 100;

    return ratio;
  };

  // How long has it been since dateString?
  var age = function (dateString) {
    var now = new Date();
    var then = new Date(dateString);
    return now - then;
  };

  // Modify box to show tweets/day
  var modifyBox = function (box, tweetsPerDay) {
    if (box.attr("data-modified") !== "1") {
      box.attr("data-modified", "1");
      box.attr("title", $.trim(box.text()));
      box.html("<strong>" + tweetsPerDay + "</strong> Tweets / day");
    }
  };

  // Modify username by appending tweets/day
  var modifyUsernameSpan = function (usernameSpan, tweetsPerDay) {
    if (usernameSpan.attr("data-modified") !== "1") {
      usernameSpan.attr("data-modified", "1");
      usernameSpan.append(" (" + tweetsPerDay + " tweets/day)");
    }
  };

  // Get tweets for username, calculate tweets/day, handle w/ callback
  var makeApiCall = function (username, callback) {
    if (username.length === 0) {
      return;
    }

    var request = $.ajax({
      url: "https://tweetsperday.herokuapp.com/tweets/" + username + ".json",
      type: "GET",
      async: true,
      dataType: "json",
      success: function (response) {
        cacheResponse(username, response, callback);
      },
      error: function (response) {
        console.log(
          "Tweets Per Day API call for " + username + " failed. ",
          response
        );
      },
    });
  };

  // Save api response for username, calculate tweets/day, handle w/ callback
  var cacheResponse = function (username, response, callback) {
    var lastTweet,
      userData = {},
      tweetsPerDay;

    // Check response is valid
    if (response.length < 1) {
      console.log("TPD recieved invalid response : " + response);
      return;
    }

    lastTweet = response[response.length - 1];
    userData.lastTweetDate = lastTweet.createdAt;
    userData.dateRetrieved = new Date().toString();

    // Save it using the Chrome extension storage API, then use that value
    cache[username] = userData;
    var dataToSave = { cache: cache };
    chrome.storage.local.set(dataToSave, function () {
      if (
        chrome.runtime.lastError &&
        chrome.runtime.lastError.message &&
        chrome.runtime.lastError.message === "MAXITEMS quota exceeded."
      ) {
        console.log("Tweets Per Day cache full. Making room");
        chrome.storage.local.clear(function () {
          chrome.storage.local.set({ cache: { username: userData } });
        });
      }
    });

    tweetsPerDay = calculateTweetsPerDay(userData);
    callback(tweetsPerDay);
  };

  // Load or create the cache
  tpd.init = function (callback) {
    chrome.storage.local.get("cache", function (data) {
      if (data && data.cache) {
        cache = data.cache;
        callback();
      } else {
        chrome.storage.local.clear(function () {
          console.log("cleared cache");
          chrome.storage.local.set({ cache: {} }, function () {
            console.log("reset cache");
            callback();
          });
        });
      }
    });
  };

  // Apply Tweets Per Day to tweet counts on the page
  tpd.applyToPage = function () {
    applyToBox($(tweetBoxSelector));
    $(usernameSpanSelector).each(function () {
      applyToUsernameSpan($(this));
    });
  };

  // Apply to any divs added to the page in the future
  tpd.setUpListeners = function () {
    var insertListener = function (event) {
      if (event.animationName == "tweetBoxInserted") {
        applyToBox($(event.target));
      } else if (event.animationName == "usernameInserted") {
        applyToUsernameSpan($(event.target));
      }
    };
    document.addEventListener("webkitAnimationStart", insertListener, false); // Chrome + Safari
  };

  return tpd;
})();

tpd.init(function () {
  tpd.applyToPage();
  tpd.setUpListeners();
});
