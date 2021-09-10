# Nav Generator

This application allow you to convert a list of bookmarks and urls into a self-contained data url that can be added to your browser bookmark. This application runs entirely on the client side and has no backend requirement.

As of right now, it only requires the static html to be hosted somewhere in the cloud. Right now for the demo, it's hosted on a github page.

## Demo

Follow this URL to create a new nav - https://synle.github.io/nav-generator/index.html?newNav


## Guide
### Schema Markup
```
! Navigation 9/10/2021, 2:57:05 PM

# Main Link Section
google finance | finance.google.com

# Secondary Section
sample alert js | javascript://alert('hello')
sample data url | data:text/html,%3Chtml%3E%0A%20%20%20%20%20%20%20%20%3Chead%3E%0A%20%20%20%20%20%20%20%20%20%20%3Clink%20rel%3D%22stylesheet%22%20type%3D%22text%2Fcss%22%20href%3D%22https%3A%2F%2Fsynle.github.io%2Flink%2Fassets%2Fnavs.css%22%3E%0A%20%20%20%20%20%20%20%20%20%20%3Cmeta%20charset%3D'utf-8'%3E%0A%20%20%20%20%20%20%20%20%3C%2Fhead%3E%0A%20%20%20%20%20%20%20%20%3Cbody%3E%0A%20%20%20%20%20%20%20%20%20%20%3Cscript%20src%3D%22https%3A%2F%2Fsynle.github.io%2Flink%2Fassets%2Fnavs.js%22%3E%3C%2Fscript%3E%0A%20%20%20%20%20%20%20%20%20%20%3Cscript%20id%3D'schema'%20type%3D'schema'%3E!%20Data%20Test%20Navigation%0A%0A%23%20Main%20Section%0Agoogle%7Cgoogle.com%0A%3C%2Fscript%3E%0A%20%20%20%20%20%20%20%20%20%20%3Cscript%3E%0A%20%20%20%20%20%20%20%20%20%20%20%20window.onViewLinks(window.getLinkDom(document.querySelector('%23schema').innerText.trim()))%3B%0A%20%20%20%20%20%20%20%20%20%20%3C%2Fscript%3E%0A%20%20%20%20%20%20%20%20%3C%2Fbody%3E%0A%20%20%20%20%20%20%3C%2Fhtml%3E

# Notes
```
TODO 1
TODO 2
```

# Tabs
>>>tabName1|blockId1>>>tabName2|blockId2

```blockId1
sample blockId1
```

---blockId2
<u><b>sample html</b></u> blockId2
---
```

#### Generated View
