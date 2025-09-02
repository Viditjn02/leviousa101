#!/bin/bash
echo "🔥 BRUTE FORCE GOOGLE CACHE REFRESH - INITIATED"

# Multiple rapid-fire IndexNow submissions
echo "📡 Sending IndexNow notifications..."
for i in {1..3}; do
  curl -X POST "https://api.indexnow.org/indexnow" \
    -H "Content-Type: application/json" \
    -d '{
      "host": "www.leviousa.com",
      "key": "47cae371c4b44f3eb4171e0b6b9b87ba",
      "keyLocation": "https://www.leviousa.com/47cae371c4b44f3eb4171e0b6b9b87ba.txt",
      "urlList": ["https://www.leviousa.com/"]
    }' --silent &
  sleep 1
done
wait

# Search engine trigger requests
echo "🤖 Triggering search engine visits..."
for engine in "Googlebot/2.1" "Bingbot/2.0" "facebookexternalhit/1.1" "Twitterbot/1.0"; do
  curl -X GET "https://www.leviousa.com/" \
    -H "User-Agent: Mozilla/5.0 (compatible; $engine)" \
    --silent --output /dev/null &
done
wait

# Cache busting requests
echo "🚀 Cache busting requests..."
for i in {1..5}; do
  curl -X GET "https://www.leviousa.com/?bust_cache=$(date +%s)" \
    --silent --output /dev/null &
done
wait

echo "✅ BRUTE FORCE REFRESH COMPLETE"
echo "⏱️  Google should update within 1-6 hours"
