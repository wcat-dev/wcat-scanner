# WCAT-Scanner

WCAT-Scanner CLI tool

## Setup Instructions

### Requirements

Make will fail with warnings if requirements are not met.

You need:

- [Make](https://www.gnu.org/software/make/)
- [CMake](https://cmake.org)
- [Docker Compose v2](https://docs.docker.com/compose/compose-v2/)
- [Cargo](https://www.rust-lang.org/learn/get-started)

### Build

`make`

## Documentation

Documentation can be found at [docs.wcat.dev](https://docs.wcat.dev).

### Architecture

```mermaid
erDiagram
    WCAT-Scanner ||--|| API : request_json
    API ||..|| MongoDB : store_userdata
    API ||--|| Pagemind : scrape_page
    API ||..|| Crawler : crawl_site
    Pagemind ||..|| MAV : image_processing
    Pagemind ||--|| Chrome : puppeteer
    Chrome ||--|| Webpage : render
    Crawler ||..|{ Webpage : crawl_links
```

<div>
    <div>
        <img
            style="width:49%"
            alt=""
            src="https://github.com/wcat-org/wcat-scanner/blob/main/readme/mandatory.svg">
        <img
            style="width:49%"
            alt=""
            src="https://github.com/wcat-org/wcat-scanner/blob/main/readme/optional.svg">
    </div>
    <div>
        <img
            style="width:49%"
            alt=""
            src="https://github.com/wcat-org/wcat-scanner/blob/main/readme/only-one.svg">
        <img
            style="width:49%"
            alt=""
            src="https://github.com/wcat-org/wcat-scanner/blob/main/readme/one-or-many.svg">
    </div>
</div>

[How to read an erDiagram.](https://www.lucidchart.com/pages/er-diagrams)

## RoadMap
