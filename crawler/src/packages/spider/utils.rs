use log::{info, log_enabled, Level};
use reqwest::Client;
use reqwest::StatusCode;

/// Perform a network request to a resource extracting all content as text.
pub async fn fetch_page_html(url: &str, client: &Client) -> Option<String> {
    match client.get(url).send().await {
        Ok(res) if res.status() == StatusCode::OK => match res.text().await {
            Ok(text) => Some(text),
            Err(_) => {
                log("- error fetching {}", &url);
                None
            }
        },
        Ok(_) => None,
        Err(_) => {
            log("- error parsing html text {}", &url);
            None
        }
    }
}

/// log to console if configuration verbose.
pub fn log(message: &'static str, data: impl AsRef<str>) {
    if log_enabled!(Level::Info) {
        info!("{message} - {}", data.as_ref());
    }
}
