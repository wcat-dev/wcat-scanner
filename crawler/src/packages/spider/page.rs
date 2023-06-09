use crate::packages::scraper::{ElementRef, Html, Selector};
use crate::spider::utils::fetch_page_html;
use crate::spider::website::CaseInsensitiveString;
use compact_str::CompactString;
use hashbrown::HashSet;
use reqwest::Client;
use smallvec::SmallVec;
use tokio_stream::StreamExt;
use url::Url;

/// Represent a page visited. This page contains HTML scraped with [scraper](https://crates.io/crates/scraper).
#[derive(Debug, Clone)]
pub struct Page {
    /// HTML parsed with [scraper](https://crates.io/crates/scraper) lib. The html is not stored and only used to parse links.
    pub html: Option<String>,
    /// Base absolute url for page.
    base: Url,
}

/// CSS query selector to ignore all resources that are not valid web pages.
const MEDIA_IGNORE_SELECTOR: &str = r#":not([style*="display: none"]):not([style*="visibility: hidden"]):not([href$=".ico"]):not([href$=".png"]):not([href$=".jpg"]):not([href$=".jpeg"]):not([href$=".svg"]):not([href$=".xlsx"]):not([href$=".img"]):not([href$=".webp"]):not([href$=".gif"]):not([href$=".pdf"]):not([href$=".tiff"]):not([href$=".mov"]):not([href$=".wav"]):not([href$=".mp3"]):not([href$=".mp4"]):not([href$=".ogg"]):not([href$=".webm"]):not([href$=".sql"]):not([href$=".zip"]):not([href$=".doc"]):not([href$=".docx"]):not([href$=".git"]):not([href$=".json"]):not([href$=".xml"]):not([href$=".css"]):not([href$=".md"]):not([href$=".txt"]):not([href$=".js"]):not([href$=".jsx"]):not([href$=".csv"])"#;
/// CSS query selector for all relative links that includes MEDIA_IGNORE_SELECTOR
const MEDIA_SELECTOR_RELATIVE: &str = r#"a[href^="/"]:not([href$=".ico"]):not([href$=".png"]):not([href$=".jpg"]):not([href$=".jpeg"]):not([href$=".svg"]):not([href$=".xlsx"]):not([href$=".img"]):not([href$=".webp"]):not([href$=".gif"]):not([href$=".pdf"]):not([href$=".tiff"]):not([href$=".mov"]):not([href$=".wav"]):not([href$=".mp3"]):not([href$=".mp4"]):not([href$=".ogg"]):not([href$=".webm"]):not([href$=".sql"]):not([href$=".zip"]):not([href$=".doc"]):not([href$=".docx"]):not([href$=".git"]):not([href$=".json"]):not([href$=".xml"]):not([href$=".css"]):not([href$=".md"]):not([href$=".txt"]):not([href$=".js"]):not([href$=".jsx"]):not([href$=".csv"])"#;
/// CSS query selector for all common static MIME types.
const MEDIA_SELECTOR_STATIC: &str = r#"[href$=".html"] [href$=".htm"] [href$=".asp"] [href$=".aspx"] [href$=".php"] [href$=".jps"] [href$=".jpsx"]"#;

lazy_static! {
    /// include only list of resources
    static ref ONLY_RESOURCES: HashSet<CaseInsensitiveString> = {
        let mut m: HashSet<CaseInsensitiveString> = HashSet::with_capacity(14);

        m.extend([
            "html", "htm", "asp", "aspx", "php", "jps", "jpsx",
            // handle .. prefix for urls ending with an extra ending
            ".html", ".htm", ".asp", ".aspx", ".php", ".jps", ".jpsx",
        ].map(|s| s.into()));

        m
    };
}

/// build absolute page selectors
fn build_absolute_selectors(url: &str) -> String {
    let off_target = if url.starts_with("https") {
        url.replacen("https://", "http://", 1)
    } else {
        url.replacen("http://", "https://", 1)
    };

    // handle unsecure and secure transports
    string_concat::string_concat!(
        "a[href^=",
        r#"""#,
        off_target,
        r#"""#,
        "i ],",
        "a[href^=",
        r#"""#,
        url,
        r#"""#,
        "i ]",
        MEDIA_IGNORE_SELECTOR
    )
}

/// get the clean domain name
pub fn domain_name(domain: &Url) -> &str {
    let b = unsafe { domain.host_str().unwrap_unchecked() };
    let b = b.split('.').collect::<Vec<&str>>();

    if b.len() > 2 {
        b[1]
    } else if b.len() == 2 {
        b[0]
    } else {
        b[b.len() - 2]
    }
}

/// convert to absolute path
#[inline]
fn convert_abs_path(base: &Url, href: &str) -> Url {
    match base.join(href) {
        Ok(mut joined) => {
            joined.set_fragment(None);
            joined
        }
        Err(_) => base.clone(),
    }
}

/// html selector for valid web pages for domain.
pub fn get_page_selectors(
    url: &str,
    subdomains: bool,
    tld: bool,
) -> Option<(
    Selector,
    CompactString,
    smallvec::SmallVec<[CompactString; 2]>,
)> {
    match Url::parse(&url) {
        Ok(host) => {
            let host_name = CompactString::from(
                match convert_abs_path(&host, Default::default()).host_str() {
                    Some(host) => host.to_ascii_lowercase(),
                    _ => Default::default(),
                },
            );

            let scheme = host.scheme();

            if tld || subdomains {
                let base = Url::parse(&url).expect("Invalid page URL");
                let dname = domain_name(&base);
                let scheme = base.scheme();

                // . extension
                let tlds = if tld {
                    string_concat::string_concat!(
                        "a[href^=",
                        r#"""#,
                        scheme,
                        "://",
                        dname,
                        r#"""#,
                        "i ]",
                        MEDIA_IGNORE_SELECTOR,
                        ","
                    )
                // match everything that follows the base.
                } else {
                    "".to_string()
                };

                let absolute_selector = build_absolute_selectors(url);

                // absolute urls with subdomains
                let absolute_selector = &if subdomains {
                    string_concat::string_concat!(
                        absolute_selector,
                        MEDIA_IGNORE_SELECTOR,
                        ",",
                        "a[href^=",
                        r#"""#,
                        scheme,
                        r#"""#,
                        "]",
                        "[href*=",
                        r#"""#,
                        ".",
                        dname,
                        ".",
                        r#"""#,
                        "i ]",
                        MEDIA_IGNORE_SELECTOR
                    )
                } else {
                    absolute_selector
                };

                // static html group parse
                Some((
                    unsafe {
                        Selector::parse(&string_concat::string_concat!(
                            tlds,
                            MEDIA_SELECTOR_RELATIVE,
                            ",",
                            absolute_selector,
                            ",",
                            MEDIA_SELECTOR_RELATIVE,
                            " ",
                            MEDIA_SELECTOR_STATIC,
                            ", ",
                            absolute_selector,
                            " ",
                            MEDIA_SELECTOR_STATIC
                        ))
                        .unwrap_unchecked()
                    },
                    dname.into(),
                    smallvec::SmallVec::from([host_name, CompactString::from(scheme)]),
                ))
            } else {
                let absolute_selector = build_absolute_selectors(url);
                let static_html_selector = string_concat::string_concat!(
                    MEDIA_SELECTOR_RELATIVE,
                    " ",
                    MEDIA_SELECTOR_STATIC,
                    ",",
                    " ",
                    absolute_selector,
                    " ",
                    MEDIA_SELECTOR_STATIC
                );

                Some((
                    unsafe {
                        Selector::parse(&string_concat::string_concat!(
                            MEDIA_SELECTOR_RELATIVE,
                            ",",
                            absolute_selector,
                            ",",
                            static_html_selector
                        ))
                        .unwrap_unchecked()
                    },
                    CompactString::default(),
                    smallvec::SmallVec::from([host_name, CompactString::from(scheme)]),
                ))
            }
        }
        _ => None,
    }
}

/// Instantiate a new page without scraping it (used for testing purposes).
pub fn build(url: &str, html: Option<String>) -> Page {
    Page {
        html: if html.is_some() { html } else { None },
        base: Url::parse(&url).expect("Invalid page URL"),
    }
}

impl Page {
    /// Instantiate a new page and gather the html.
    pub async fn new(url: &str, client: &Client) -> Self {
        build(url, fetch_page_html(&url, &client).await)
    }

    /// URL getter for page.
    pub fn get_url(&self) -> &str {
        self.base.as_str()
    }

    /// Html getter for page.
    pub fn get_html(&self) -> &str {
        unsafe { &self.html.as_deref().unwrap_unchecked() }
    }

    /// Find all link hrefs using the ego tree extremely imp useful when concurrency is low
    #[inline(always)]
    pub async fn links_ego(
        &self,
        selectors: &(Selector, CompactString, SmallVec<[CompactString; 2]>),
    ) -> HashSet<CaseInsensitiveString> {
        let base_domain = &selectors.1;
        let mut map: HashSet<CaseInsensitiveString> = HashSet::new();
        let html = Html::parse_document(self.get_html());
        tokio::task::yield_now().await;

        // extremely fast ego tree handling
        for node in html.tree.root().traverse() {
            match node {
                ego_tree::iter::Edge::Open(node_ref) => {
                    if let Some(element) = ElementRef::wrap(node_ref) {
                        if element.parent().is_some() && selectors.0.matches(&element) {
                            match element.value().attr("href") {
                                Some(val) => {
                                    let abs = self.abs_path(val);

                                    if base_domain.is_empty()
                                        || base_domain.as_str() == domain_name(&abs)
                                    {
                                        let resource_ext = abs.as_str();
                                        let resource_ext_size = resource_ext.len();
                                        let resource =
                                            &resource_ext[resource_ext_size - 5..resource_ext_size];

                                        if let Some(position) = resource.find('.') {
                                            if ONLY_RESOURCES.contains(
                                                &CaseInsensitiveString::from(
                                                    &resource[position + 1..resource.len()],
                                                ),
                                            ) {
                                                map.insert(resource_ext.into());
                                            }
                                        } else {
                                            map.insert(resource_ext.into());
                                        }
                                    }
                                }
                                None => (),
                            }
                        }
                    }
                }
                _ => (),
            }
        }

        map
    }

    /// Find the links as a stream using string resource validation
    #[inline(always)]
    pub async fn links_stream(
        &self,
        selectors: &(Selector, CompactString, SmallVec<[CompactString; 2]>),
    ) -> HashSet<CaseInsensitiveString> {
        let base_domain = &selectors.1;

        let mut map: HashSet<CaseInsensitiveString> = HashSet::new();
        let html = Box::new(Html::parse_document(self.get_html()));
        tokio::task::yield_now().await;

        let mut stream = tokio_stream::iter(html.tree);
        let parent_frags = &selectors.2; // todo: allow mix match tpt
        let parent_host = &parent_frags[0];
        let parent_host_scheme = &parent_frags[1];

        while let Some(node) = stream.next().await {
            if let Some(element) = node.as_element() {
                match element.attr("href") {
                    Some(href) => {
                        let mut abs = self.abs_path(href);
                        let mut can_process = match abs.host_str() {
                            Some(host) => host == parent_host.as_str(),
                            _ => false,
                        };

                        if can_process {
                            if abs.scheme() != parent_host_scheme.as_str() {
                                let _ = abs.set_scheme(parent_host_scheme.as_str());
                            }

                            let h = abs.as_str();
                            let hlen = h.len();

                            if hlen > 4 {
                                let hchars = &h[hlen - 5..hlen];
                                if let Some(position) = hchars.find('.') {
                                    let resource_ext = &hchars[position + 1..hchars.len()];

                                    if !ONLY_RESOURCES
                                        .contains(&CaseInsensitiveString::from(resource_ext))
                                    {
                                        can_process = false;
                                    }
                                }
                            }

                            if can_process && base_domain.is_empty()
                                || base_domain.as_str() == domain_name(&abs)
                            {
                                map.insert(h.into());
                            }
                        }
                    }
                    _ => (),
                };
            }
        }

        map
    }

    /// Find all href links and return them using CSS selectors.
    #[inline(never)]
    pub async fn links(
        &self,
        selectors: &(Selector, CompactString, SmallVec<[CompactString; 2]>),
        streamed: Option<bool>,
    ) -> HashSet<CaseInsensitiveString> {
        match streamed {
            _ if { !self.html.is_some() } => Default::default(),
            None | Some(false) => self.links_ego(&(selectors)).await,
            Some(_) => self.links_stream(&selectors).await,
        }
    }

    /// Convert a URL to its absolute path without any fragments or params.
    #[inline]
    fn abs_path(&self, href: &str) -> Url {
        convert_abs_path(&self.base, href)
    }
}

#[tokio::test]
async fn parse_links() {
    let client = Client::builder()
        .user_agent("spider/1.1.2")
        .build()
        .unwrap();

    let link_result = "https://choosealicense.com/";
    let page: Page = Page::new(&link_result, &client).await;
    let selector = get_page_selectors(&link_result, false, false);

    let links = page.links(&selector.unwrap(), None).await;

    assert!(
        links.contains::<CaseInsensitiveString>(&"https://choosealicense.com/about/".into()),
        "Could not find {}. Theses URLs was found {:?}",
        page.get_url(),
        &links
    );
}

#[tokio::test]
async fn test_abs_path() {
    let client = Client::builder()
        .user_agent("spider/1.1.2")
        .build()
        .unwrap();
    let link_result = "https://choosealicense.com/";
    let page: Page = Page::new(&link_result, &client).await;

    assert_eq!(
        page.abs_path("/page"),
        Url::parse("https://choosealicense.com/page").unwrap()
    );
    assert_eq!(
        page.abs_path("/page?query=keyword"),
        Url::parse("https://choosealicense.com/page?query=keyword").unwrap()
    );
    assert_eq!(
        page.abs_path("/page#hash"),
        Url::parse("https://choosealicense.com/page").unwrap()
    );
    assert_eq!(
        page.abs_path("/page?query=keyword#hash"),
        Url::parse("https://choosealicense.com/page?query=keyword").unwrap()
    );
    assert_eq!(
        page.abs_path("#hash"),
        Url::parse("https://choosealicense.com/").unwrap()
    );
    assert_eq!(
        page.abs_path("tel://+212 3456"),
        Url::parse("https://choosealicense.com/").unwrap()
    );
}
