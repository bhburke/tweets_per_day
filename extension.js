
console.log("page loaded getting tweets");
var tweet_box = $('a[data-element-term="tweet_stats"]');
var username = $(tweet_box).attr('href').substring(1);
get_tweets(username, tweet_box);


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
	//get_tweets(username, tweet_box);
});

function get_tweets(username, box){
	console.log("started tweet getting");
	var request = $.ajax({
		url: "https://api.twitter.com/1/users/lookup.json",
		type: "GET",
		async: false,
		data:{
			"screen_name": username
		},
		dataType:"json",
		success:function(response){
			parse_tweets(response, box);
		},
		error:function(response){
			console.log(response);
		}
	});

}

function parse_tweets(response, box){
	var firstDate = new Date();
	var lastDate = new Date(response[0].created_at);
	var difference = firstDate - lastDate;
	console.log(difference);
	var days = Math.round(difference/(1000*60*60*24));
	console.log(days);
	var num_tweets = response[0].statuses_count;

	var ratio = Math.round(num_tweets/days*100)/100

	console.log(num_tweets);
	box.attr("modified", "1");
	box.html("<strong>"+ratio+"</strong> Tweets / day");



}
