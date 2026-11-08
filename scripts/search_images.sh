#!/bin/bash
# Parallel fashion image search for ÉLAN e-commerce site
# Each line: key|count|query
mkdir -p /home/z/my-project/scripts/img

cat > /tmp/img_queries.txt << 'EOF'
hero_w1|8|high fashion editorial photography elegant woman studio dramatic lighting
hero_m1|8|male fashion editorial photography stylish man studio
promo_1|4|autumn fashion editorial woman coat street style photography
promo_2|4|glamour evening party dress fashion editorial photography
p_dress|8|elegant woman wearing black satin slip dress fashion photography
p_blazer|8|woman wearing oversized blazer fashion photography
p_knit|8|woman wearing cozy knit cardigan sweater fashion photography
p_trousers|8|woman wearing wide leg tailored trousers fashion photography
p_trench|8|woman wearing beige trench coat fashion street photography
p_cami|8|woman wearing satin cami top silk blouse fashion photography
p_jeans_w|8|woman wearing high waisted straight leg jeans denim fashion photography
p_skirt|8|woman wearing pleated midi skirt fashion photography
p_tee_m|8|man wearing plain white t-shirt fashion photography
p_shirt_m|8|man wearing oxford button down shirt fashion photography
p_hoodie|8|man wearing hoodie streetwear fashion photography
p_bomber|8|man wearing bomber jacket street style fashion photography
p_jeans_m|8|man wearing slim fit jeans denim fashion photography
p_merino|8|man wearing knit crewneck sweater fashion photography
p_heels|8|elegant high heel shoes product photography
p_sneakers_w|8|white leather sneakers minimal product photography
p_chelsea|8|leather chelsea boots product photography
p_chunky|8|chunky sneakers product photography
p_loafers|8|leather loafers shoes product photography
p_sandals|8|strappy heeled sandals shoes product photography
p_tote|8|structured leather tote handbag product photography
p_necklace|8|gold layered necklace jewelry product photography
p_sunglasses|8|stylish sunglasses product photography
p_watch|8|minimalist luxury wrist watch product photography
p_scarf|8|cashmere scarf fashion product photography
p_cap|8|baseball cap product photography
p_crossbody|8|leather crossbody bag product photography
p_lipstick|8|matte lipstick cosmetics product photography
p_perfume|8|luxury perfume bottle product photography
p_serum|8|skincare serum bottle product photography
p_palette|8|makeup eyeshadow palette cosmetics product photography
p_leggings|8|woman wearing black leggings activewear fitness photography
p_trainingtee|8|man wearing athletic training t-shirt sportswear photography
p_sportsbra|8|woman wearing sports bra activewear fitness photography
p_runjacket|8|lightweight running jacket sportswear photography
p_joggers|8|man wearing joggers sweatpants sportswear photography
EOF

run_search() {
  local key="$(echo "$1" | cut -d'|' -f1)"
  local count="$(echo "$1" | cut -d'|' -f2)"
  local query="$(echo "$1" | cut -d'|' -f3)"
  local out="/home/z/my-project/scripts/img/${key}.json"
  if [ -s "$out" ]; then echo "skip $key"; return; fi
  local attempt=1
  while [ $attempt -le 5 ]; do
    z-ai image-search -q "$query" -c "$count" --gl us --no-rank -o "$out" > /dev/null 2>&1
    if [ -s "$out" ]; then echo "done $key (attempt $attempt)"; return; fi
    echo "retry $key (attempt $attempt)"
    sleep $((attempt * 15))
    attempt=$((attempt + 1))
  done
  echo "FAIL $key"
}
export -f run_search

# run with low concurrency to avoid rate limits
cat /tmp/img_queries.txt | xargs -P 3 -I {} bash -c 'run_search "{}"'
echo "ALL SEARCHES COMPLETE"
