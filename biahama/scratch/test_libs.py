try:
    import selenium
    print("selenium: OK")
except ImportError:
    print("selenium: NO")

try:
    import playwright
    print("playwright: OK")
except ImportError:
    print("playwright: NO")

try:
    import pyppeteer
    print("pyppeteer: OK")
except ImportError:
    print("pyppeteer: NO")

try:
    import requests
    print("requests: OK")
except ImportError:
    print("requests: NO")
