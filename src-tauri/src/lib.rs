use std::thread;
use std::fs;
use std::process::Command;
use rand::{distributions::Alphanumeric, Rng};
use serde::{Deserialize, Serialize};
use tiny_http::{Server, Response, Method};

#[derive(Serialize, Deserialize, Clone)]
struct BridgeConfig {
    port: u16,
    token: String,
}

#[derive(Deserialize)]
struct ExecuteRequest {
    token: String,
    command: String,
}

#[derive(Serialize)]
struct ExecuteResponse {
    stdout: String,
    stderr: String,
    status: i32,
}

#[tauri::command]
fn execute_command(command: String) -> Result<ExecuteResponse, String> {
    let output = if cfg!(target_os = "windows") {
        Command::new("cmd").args(["/C", &command]).output()
    } else {
        Command::new("sh").args(["-c", &command]).output()
    };

    match output {
        Ok(out) => Ok(ExecuteResponse {
            stdout: String::from_utf8_lossy(&out.stdout).to_string(),
            stderr: String::from_utf8_lossy(&out.stderr).to_string(),
            status: out.status.code().unwrap_or(-1),
        }),
        Err(e) => Err(e.to_string()),
    }
}

#[tauri::command]
fn log_command(command: String) -> Result<(), String> {
    use std::io::Write;
    let log_path = "../.thrx/audit.log";
    let _ = fs::create_dir_all("../.thrx");
    
    let mut file = fs::OpenOptions::new()
        .create(true)
        .append(true)
        .open(log_path)
        .map_err(|e| e.to_string())?;

    let timestamp = chrono::Local::now().format("%Y-%m-%d %H:%M:%S").to_string();
    writeln!(file, "[{}] EXEC: {}", timestamp, command).map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
fn get_bridge_config(state: tauri::State<BridgeConfig>) -> BridgeConfig {
    state.inner().clone()
}

fn start_bridge_server() -> BridgeConfig {
    let port = 3001; // We could make this dynamic
    let token: String = rand::thread_rng()
        .sample_iter(&Alphanumeric)
        .take(16)
        .map(char::from)
        .collect();

    let config = BridgeConfig { port, token: token.clone() };
    
    // Write config for auto-discovery
    // We only write to the parent directory (project root) to avoid infinite rebuild loops
    if let Ok(config_json) = serde_json::to_string(&config) {
        let root_path = "../thrx_bridge.json";
        match fs::write(root_path, &config_json) {
            Ok(_) => println!("Successfully wrote bridge config to {}", root_path),
            Err(e) => eprintln!("Failed to write bridge config to {}: {}", root_path, e),
        }
    }

    let server_config = config.clone();
    thread::spawn(move || {
        let server = Server::http(format!("127.0.0.1:{}", port)).unwrap();
        for mut request in server.incoming_requests() {
            // Handle CORS
            if request.method() == &Method::Options {
                let response = Response::empty(200)
                    .with_header(tiny_http::Header::from_bytes(&b"Access-Control-Allow-Origin"[..], &b"*"[..]).unwrap())
                    .with_header(tiny_http::Header::from_bytes(&b"Access-Control-Allow-Methods"[..], &b"POST, OPTIONS"[..]).unwrap())
                    .with_header(tiny_http::Header::from_bytes(&b"Access-Control-Allow-Headers"[..], &b"Content-Type"[..]).unwrap());
                let _ = request.respond(response);
                continue;
            }

            if request.method() == &Method::Post && request.url() == "/execute" {
                let mut content = String::new();
                request.as_reader().read_to_string(&mut content).unwrap();
                
                let req: ExecuteRequest = match serde_json::from_str(&content) {
                    Ok(r) => r,
                    Err(_) => {
                        let _ = request.respond(Response::from_string("Invalid JSON").with_status_code(400));
                        continue;
                    }
                };

                if req.token != token {
                    let _ = request.respond(Response::from_string("Unauthorized").with_status_code(401));
                    continue;
                }

                // Execute command
                let _ = fs::write("../BRIDGE_LOG.md", format!("Executing: {}\n", req.command));

                let output = if cfg!(target_os = "windows") {
                    Command::new("cmd").args(["/C", &req.command]).output()
                } else {
                    Command::new("sh").args(["-c", &req.command]).output()
                };

                match output {
                    Ok(out) => {
                        let stdout = String::from_utf8_lossy(&out.stdout).to_string();
                        let stderr = String::from_utf8_lossy(&out.stderr).to_string();
                        let _ = fs::write("../BRIDGE_LOG.md", format!("Result for {}:\nStdout: {}\nStderr: {}\n", req.command, stdout, stderr));

                        let res = ExecuteResponse {
                            stdout,
                            stderr,
                            status: out.status.code().unwrap_or(-1),
                        };
                        let response = Response::from_string(serde_json::to_string(&res).unwrap())
                            .with_header(tiny_http::Header::from_bytes(&b"Content-Type"[..], &b"application/json"[..]).unwrap())
                            .with_header(tiny_http::Header::from_bytes(&b"Access-Control-Allow-Origin"[..], &b"*"[..]).unwrap());
                        let _ = request.respond(response);
                    }
                    Err(e) => {
                        let _ = fs::write("../BRIDGE_LOG.md", format!("Error for {}: {}\n", req.command, e));
                        let _ = request.respond(Response::from_string(e.to_string()).with_status_code(500));
                    }
                }
            } else {
                let _ = request.respond(Response::from_string("Not Found").with_status_code(404));
            }
        }
    });

    server_config
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
  let config = start_bridge_server();
  
  tauri::Builder::default()
    .manage(config)
    .invoke_handler(tauri::generate_handler![get_bridge_config, execute_command, log_command])
    .setup(|app| {
      if cfg!(debug_assertions) {
        app.handle().plugin(
          tauri_plugin_log::Builder::default()
            .level(log::LevelFilter::Info)
            .build(),
        )?;
      }
      Ok(())
    })
    .run(tauri::generate_context!())
    .expect("error while running tauri application");
}

