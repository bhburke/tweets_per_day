var tpd = function() {
  var tpd = {}; // The object to be returned

  // Private variables
  var tweet_box_selector = 'a[data-element-term="tweet_stats"]',
    username_span_selector = 'span.username',
    hours_to_keep_cache = 12,
    cache = {};

  // Private functions

  // Apply Tweets Per Day to a tweet box
  var apply_to_box = function(tweet_box) {
    var username = tweet_box.attr('href').substring(1);
    get_tweets_per_day(username, function(tweets_per_day){
        modify_box(tweet_box, tweets_per_day);
    });
  }

  // Apply Tweets Per Day to a user span
  var apply_to_username_span = function(username_span) {
    var username = username_span.find('b').text();
    get_tweets_per_day(username, function(tweets_per_day){
        modify_username_span(username_span, tweets_per_day);
    });
  }

  // Get the number of tweets per day made by username, handle in callback
  var get_tweets_per_day = function(username, callback){
    var user_data = cache[username];
    if (data_is_fresh(user_data)) {
      // Use cached user data
      tpd = calculate_tweets_per_day(user_data);
      callback(tpd);
    } else {
      // Look up tweets
      make_api_call(username, callback);
    }
  }

  // Is the cached data valid and recent?
  var data_is_fresh = function(user_data) {
    return user_data && user_data.date_retrieved &&
      age(user_data.date_retrieved) < 60*60*1000*hours_to_keep_cache;
  }

  // Take stored data about user and return their estimated tweets/day
  var calculate_tweets_per_day = function(user_data) {
    var milliseconds = age(user_data.last_tweet_date);
    var days = milliseconds/(1000*60*60*24);
    var num_tweets = 20;

    var ratio = Math.round(num_tweets/days*100)/100;

    return ratio;
  }

  // How long has it been since dateString?
  var age = function(dateString) {
    var now = new Date();
    var then = new Date(dateString);
    return now - then;
  }

  // Modify box to show tweets/day
  var modify_box = function(box, tweets_per_day){
    if (box.attr("data-modified") !== "1") {
      box.attr("data-modified", "1");
      box.attr("title", $.trim(box.text()));
      box.html("<strong>"+tweets_per_day+"</strong> Tweets / day");
    }
  }

  // Modify username by appending tweets/day
  var modify_username_span = function(username_span, tweets_per_day){
    if (username_span.attr("data-modified") !== "1") {
        username_span.attr("data-modified", "1");
        username_span.append(" ("+tweets_per_day+" tweets/day)");
    }
  }

  // Get tweets for username, calculate tweets/day, handle w/ callback
  var make_api_call = function(username, callback) {
    if (username.length === 0) {
        return;
    }

    var request = $.ajax({
      url: "http://powerful-brook-6264.herokuapp.com/tweets/"+username+".json",
      type: "GET",
      async: true,
      data:{
        "include_rts": "true",
      },
      dataType:"json",
      success:function(response){
        cache_response(username, response, callback);
      },
      error:function(response){
        console.log("Tweets Per Day API call for "+username+" failed. ",response);
      }
    });

  }

  // Save api response for username, calculate tweets/day, handle w/ callback
  var cache_response = function(username, response, callback) {
    var last_tweet, user_data = {}, tweets_per_day;

    // Check response is valid
    if (response.length < 1) {
      console.log("TPD recieved invalid response : "+response);
      return;
    }

    last_tweet = response[response.length-1];
    user_data.last_tweet_date = last_tweet.created_at;
    user_data.date_retrieved = (new Date()).toString();

    // Save it using the Chrome extension storage API, then use that value
    cache[username] = user_data;
    var data_to_save = {"cache": cache};
    chrome.storage.local.set(data_to_save, function(){
      if (chrome.runtime.lastError &&
          chrome.runtime.lastError.message &&
          chrome.runtime.lastError.message === "MAX_ITEMS quota exceeded.") {
        console.log("Tweets Per Day cache full. Making room");
        chrome.storage.local.clear(function(){
          chrome.storage.local.set({"cache":{username: user_data}});
        });
      }
    });

    tweets_per_day = calculate_tweets_per_day(user_data);
    callback(tweets_per_day);
  }

  // Load or create the cache
  tpd.init = function(callback) {
    chrome.storage.local.get("cache", function(data){
      if (data && data.cache) {
        cache = data.cache;
        callback();
      } else {
        chrome.storage.local.clear(function(){
          console.log("cleared cache");
          chrome.storage.local.set({"cache":{}}, function(){
            console.log("reset cache");
            callback();
          });
        });
      }
    });
  }

  // Apply Tweets Per Day to tweet counts on the page
  tpd.apply_to_page = function() {
    apply_to_box($(tweet_box_selector));
    $(username_span_selector).each(function(){
      apply_to_username_span($(this));
    });
  }

  // Apply to any divs added to the page in the future
  tpd.set_up_listeners = function() {
    var insertListener = function(event){
      if (event.animationName == "tweetBoxInserted") {
        apply_to_box($(event.target));
      } else if (event.animationName == "usernameInserted") {
        apply_to_username_span($(event.target));
      }
    }
    document.addEventListener("webkitAnimationStart", insertListener, false); // Chrome + Safari
  }

  return tpd;
}()

tpd.init(function() {
  tpd.apply_to_page();
  tpd.set_up_listeners();
});
