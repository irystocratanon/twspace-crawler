docker_build:
	sudo docker buildx build -t local/twspace-crawler --pull .

get_token:
	#!/bin/bash
	tokens="$(grep -ohE '\s(ct0|auth_token)\s.*' ~/ytarchive/data/cookies-tweetdeck.txt)"
	auth_token="$(printf "%s" "$tokens" | grep -F auth_token | head -1 | rev | awk '{print $1}' | rev)"
	ct0="$(printf "%s" "$tokens" | grep -F ct0 | head -1 | rev | awk '{print $1}' | rev)"
	printf "TWITTER_AUTH_TOKEN=%s\n" "$auth_token" > .env
	printf "TWITTER_CSRF_TOKEN=%s\n" "$ct0" >> .env
