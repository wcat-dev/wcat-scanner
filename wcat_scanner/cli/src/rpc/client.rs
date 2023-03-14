pub mod apicore {
    tonic::include_proto!("apicore");
}

use log;
use std::env::var;
use tonic::transport::Channel;
use tonic::Request;

use crate::utils::Website;
use crate::EXTERNAL;
pub use apicore::{core_service_client::CoreServiceClient, CrawlParams, Page};

/// create gRPC client from the API CORE server.
pub async fn create_client() -> Result<CoreServiceClient<Channel>, tonic::transport::Error> {
    lazy_static! {
        static ref RPC_CLIENT: String = match var(EXTERNAL) {
            Ok(_) => "http://127.0.0.1:50050",
            Err(_) => "http://127.0.0.1:50050",
        }
        .to_string();
    };

    let client = CoreServiceClient::connect(RPC_CLIENT.as_ref()).await?;

    Ok(client)
}

/// run accessibility single page results.
pub async fn scan(url: String, authorization: String) -> Website {
    let mut client = create_client().await.unwrap();
    let page = CrawlParams {
        url,
        authorization,
        ..Default::default()
    };
    let request = Request::new(page);
    let req = client.scan(request).await.unwrap().into_inner();

    req.data.unwrap_or_default().into()
}

/// run accessibility streaming multi-page results.
pub async fn crawl(
    url: String,
    authorization: String,
    subdomains: bool,
    tld: bool,
    norobo: bool,
    sitemap: bool,
) -> Vec<Page> {
    let mut client = create_client().await.unwrap();
    let page = CrawlParams {
        url,
        authorization,
        subdomains,
        tld,
        norobo,
        sitemap,
        ..Default::default()
    };
    let request = Request::new(page);
    let mut stream = client.crawl(request).await.unwrap().into_inner();

    let mut websites: Vec<Page> = Vec::new();

    while let Some(res) = stream.message().await.unwrap_or_default() {
        let page = res.data.unwrap_or_default();
        log::debug!("processed - {}", &page.url);
        websites.push(page)
    }

    websites
}
