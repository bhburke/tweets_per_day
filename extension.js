var tweet_box_selector = 'a[data-element-term="tweet_stats"]';
var username_span_selector = 'span.username';
var days_to_keep_cache = 2;
var cached_responses;

//load the cache
chrome.storage.local.get("cache", function(data){
  if(data==undefined || data["cache"]==undefined){
    chrome.storage.local.clear();
    chrome.storage.local.set({"cache":{}}, null);
    cached_responses = {};
  }
  else{
    cached_responses = data.cache;
  }

  // Apply to any divs on the page now
    apply_to_box($(tweet_box_selector));
    $(username_span_selector).each(function(){
        apply_to_username_span($(this));
    });
});




// Apply to any divs added to the page in the future
var insertListener = function(event){
  if (event.animationName == "tweetBoxInserted") {
    apply_to_box($(event.target));
  } else if (event.animationName == "usernameInserted") {
    apply_to_username_span($(event.target));
  }
}
document.addEventListener("animationstart", insertListener, false); // standard + firefox
document.addEventListener("MSAnimationStart", insertListener, false); // IE
document.addEventListener("webkitAnimationStart", insertListener, false); // Chrome + Safari

// Apply TPD to the given tweet box
function apply_to_box(tweet_box) {
    var username = tweet_box.attr('href').substring(1);
    get_tweets_per_day(username, function(tweets_per_day){
        modify_box(tweets_per_day, tweet_box);
    });
}

// Apply TPD to the given username span
function apply_to_username_span(username_span) {
    var username = username_span.find('b').text();
    get_tweets_per_day(username, function(tweets_per_day){
        modify_username_span(tweets_per_day, username_span);
    });
}

// Get the number of tweets per day made by username, handle in callback
function get_tweets_per_day(username, callback){
		var user_data = cached_responses[username];
		if (user_data == undefined ||
            user_data.date_retrieved == undefined ||
            $.isEmptyObject(user_data.date_retrieved) ||
            Date() - new Date(user_data.date_retrieved) > 60*60*days_to_keep_cache) {

            make_api_call(username, callback);
        } else {
            // Calculate tweets per day based on tweet dates
            tpd = calculate_tweets_per_day(user_data);
            callback(tpd);
		}
}

// Get tweets for username, calculate tweets/day, handle w/ callback
function make_api_call(username, callback) {
    if (username.length == 0) {
        return;
    }

	console.log("Looking up tweets per day for "+username);
	var request = $.ajax({
		url: "https://api.twitter.com/1/statuses/user_timeline.json",
		type: "GET",
		async: true,
		data:{
			"include_rts": "true",
			"screen_name": username
		},
		dataType:"json",
		success:function(response){
			cache_response(username, response, callback);
		},
		error:function(response){
			//console.log("Tweets Per Day API call for "+username+" failed. ",response);
		}
	});

}

// Save api response for username, calculate tweets/day, handle w/ callback
function cache_response(username, response, callback) {

  // Check response is valid
  if (response.length < 1) {
  	console.log("TPD recieved invalid response : "+response);
  	return;
  }

  var last_tweet = response[response.length-1];
  var user_data = {}
  user_data["last_tweet_date"] = last_tweet.created_at;
  user_data["date_retrieved"] = (new Date()).toString();

  //console.log("caching " + username + " ",user_data);

  // Save it using the Chrome extension storage API, then use that value
  cached_responses[username] = user_data;
  var data_to_save = {"cache": cached_responses};
  chrome.storage.local.set(data_to_save, function(){
    if (chrome.runtime.lastError &&
        chrome.runtime.lastError.message &&
        chrome.runtime.lastError.message == "MAX_ITEMS quota exceeded.") {
      console.log("Cache full. Making room");
      clear_expired_cache_entries();
      chrome.storage.local.set(data_to_save,function(){
        //console.log("Saving again");
      });
    }
  });

  var tpd = calculate_tweets_per_day(user_data);
  callback(tpd);
}

function clear_expired_cache_entries(){
  var oldest_date = new Date();
  var oldest_entry = "";
  var made_space = false;
  $.each(cached_responses, function(username, user_data){
    if (user_data == undefined ||
            user_data.date_retrieved == undefined ||
            $.isEmptyObject(user_data.date_retrieved) ||
            Date() - new Date(user_data.date_retrieved) > 60*60*days_to_keep_cache) {
        delete cached_responses[username];
      made_space = true;
    }
    else if(new Date(user_data.date_retrieved) < oldest_date){
      oldest_date = new Date(user_data.date_retrieved);
      oldest_username = username;
    }
  });
  if(!made_space){
      delete cached_responses[oldest_username];
    }
  
}

// Take stored data about user and return their estimated tweets/day
function calculate_tweets_per_day(user_data) {

    var today = new Date();
    var created_at = new Date(user_data.last_tweet_date);
    var difference = today - created_at;
    var days = difference/(1000*60*60*24);
    var num_tweets = 20;

    var ratio = Math.round(num_tweets/days*100)/100;

    return ratio;
}

// Modify box to show tweets/day given the date of a user's 20th tweet
function modify_box(tweets_per_day, box){

	if (box.attr("modified") != "1") {
        box.attr("modified", "1");
        box.attr("title", $.trim(box.text()));
        box.html("<strong>"+tweets_per_day+"</strong> Tweets / day");
    }

}

// Modify username by appending tweets/day
function modify_username_span(tweets_per_day, username_span){

    if (username_span.attr("modified") != "1") {
        username_span.attr("modified", "1");
        username_span.append(" ("+tweets_per_day+" tweets/day)");
    }

}
