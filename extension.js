
console.log("Page loaded. Getting tweets / day");
var tweet_box = $('a[data-element-term="tweet_stats"]');
var username = $(tweet_box).attr('href').substring(1);
get_tweets_per_day(username, tweet_box);


$(document).on('DOMNodeInserted', 'div#profile_popup', function(){
	console.log("new thing loaded");
	var tweet_box = $('div#profile_popup > a[data-element-term="tweet_stats"]');

	if(tweet_box.attr("modified") === undefined){
		console.log("gonna modify this");
	}
	else{
		console.log(tweet_box);
	}
	var username = $(tweet_box).attr('href').substring(1);
	//get_tweets_per_day(username, tweet_box);
});

// Modify box to show tweets/day for username
function get_tweets_per_day(username, box){
	chrome.storage.sync.get(username, function(data) {
		var user_object = data[username];
		
		if (user_object == undefined) {
			console.log(username+" is not cached. Perform api call");
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
	console.log(days);
	var num_tweets = user_object.statuses_count;

	var ratio = Math.round(num_tweets/days*100)/100;
		
	console.log(num_tweets);
	box.attr("modified", "1");
	box.html("<strong>"+ratio+"</strong> Tweets / day");

}
