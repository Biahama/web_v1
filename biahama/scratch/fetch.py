import urllib.request
import urllib.parse
import ssl

url = "https://shop.brunellocucinelli.com/en-in/women/ready-to-wear/knitwear/dazzling-water-lilies-t-shirt-261MDT771010C159.html"

headers = {
    "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8",
    "Accept-Language": "en-US,en;q=0.9",
    "Cache-Control": "no-cache",
    "Pragma": "no-cache"
}

req = urllib.request.Request(url, headers=headers)
context = ssl._create_unverified_context()

try:
    with urllib.request.urlopen(req, context=context, timeout=15) as response:
        html = response.read().decode('utf-8')
        print("SUCCESS! Length:", len(html))
        # Find all stylesheet links
        import re
        css_links = re.findall(r'href=["\'](.*?\.css.*?)["\']', html)
        print("CSS links found:", len(css_links))
        for link in css_links[:10]:
            print("  -", link)
except Exception as e:
    print("FAILED:", str(e))
