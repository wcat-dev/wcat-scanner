use crate::rpc::health_server::{HealthCheckServer, HealthChecker};
use crate::rpc::server::{CrawlerServer, MyCrawler};
use std::net::SocketAddr;
use tonic::transport::Server;

/// start the grpc server
pub async fn grpc_start() -> Result<(), Box<dyn std::error::Error>> {
    let addr: SocketAddr = option_env!("GRPC_HOST")
        .unwrap_or("0.0.0.0:50055")
        .parse()?;
    let crawler = MyCrawler::default();
    let health = HealthChecker::default();

    println!("grpc server listening on 0.0.0.0:50055");

    Server::builder()
        .add_service(CrawlerServer::new(crawler))
        .add_service(HealthCheckServer::new(health))
        .serve(addr)
        .await?;

    Ok(())
}
