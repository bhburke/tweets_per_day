
var tweet_box_selector = 'a[data-element-term="tweet_stats"]';
var days_to_keep_cache = 3;

// Apply to any divs on the page now
var tweet_box = $(tweet_box_selector);
get_tweets_per_day(tweet_box);


// Apply to any divs added to the page in the future
var insertListener = function(event){
  if (event.animationName == "nodeInserted") {
    var tweet_box = $(event.target);
    if(tweet_box.attr("modified") === undefined){
        get_tweets_per_day(tweet_box)
    }
  }
}
document.addEventListener("animationstart", insertListener, false); // standard + firefox
document.addEventListener("MSAnimationStart", insertListener, false); // IE
document.addEventListener("webkitAnimationStart", insertListener, false); // Chrome + Safari

// Modify box to show tweets/day for username
function get_tweets_per_day(box){
    var username = box.attr('href').substring(1);

	chrome.storage.sync.get(username, function(data) {
		var user_object = data[username];
		
		if (user_object == undefined) {
			console.log(username+" is not cached. Perform api call");
			make_api_call(username, box);
		} else if (user_object.date_retrieved == undefined || Date() - user_object.date_retrieved > 60*60*days_to_keep_cache) {
            console.log(username+"'s data is too old. Refetching from api");
            make_api_call(username, box);
        } else {
			console.log(username+" is cached. Just use that info");
			modify_box(user_object, box);
		}
	});
}

// Get info about username, then modify box
function make_api_call(username, box) {
	console.log("Querying API for "+username);
	var request = $.ajax({
		url: "https://api.twitter.com/1/users/lookup.json",
		type: "GET",
		async: false,
		data:{
			"screen_name": username
		},
		dataType:"json",
		success:function(response){
			cache_response(username, response, box);
		},
		error:function(response){
			console.log(response);
		}
	});

}

// Save api response for username, then modify box
function cache_response(username, response, box) {

  // Check response is valid
  if (response.length < 1) {
  	console.log("Invalid response : "+response);
  	return;
  }

  var user_object = response[0];
  user_object.date_retrieved = new Date();
  console.log("Caching "+username+" : ", user_object);;

  // Save it using the Chrome extension storage API, then use that value
  var data_to_save = {};
  data_to_save[username] = user_object;
  chrome.storage.sync.set(data_to_save, function() {
  	console.log("Response cached");
    modify_box(user_object, box);
  });
}

// Modify box to show tweets/day for user_object
function modify_box(user_object, box){

	var today = new Date();
	var created_at = new Date(user_object.created_at);
	var difference = today - created_at;
	var days = Math.round(difference/(1000*60*60*24));
	var num_tweets = user_object.statuses_count;

	var ratio = Math.round(num_tweets/days*100)/100;
		
	console.log(user_object.screen_name+" tweets "+ratio+" times per day");
	box.attr("modified", "1");
    box.attr("title", num_tweets+" in "+days+" days");
    box.html("<strong>"+ratio+"</strong> Tweets / day");

}
