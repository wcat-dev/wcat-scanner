build:
	# Check for Cargo, Docker Compose, pkg-config, libssl-dev, build-essential, and CMake; exit if not installed.
	which cargo && echo "cargo installed already" || { echo "\n  Install Cargo:\ncurl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh \n" && exit 1; }
	docker compose > /dev/null && echo "docker compose installed already" || { echo "\n  Install Docker Compose \nhttps://docs.docker.com/compose/compose-v2/ \n"; exit 1; }
	which pkg-config && echo "pkg-config installed already" || { echo "\nInstall dependencies \n\tOn Ubuntu:\nsudo apt-get -y install pkg-config libssl-dev build-essential cmake \n"; exit 1; }

	# Start Docker Services
	docker compose up -d

	# Build wcat-scanner and copy to current dir
	cd wcat_scanner/cli; cargo build --release && cp target/release/wcat-scanner ../..

	# Suggest a command
	echo "\nTry:\n./wcat-scanner scan --url https://microsoft.com\nThey need a lot of work.\n"

down:
	docker compose down

prune:
	docker compose down
	docker system prune
	sudo rm -fr ./mongodb
