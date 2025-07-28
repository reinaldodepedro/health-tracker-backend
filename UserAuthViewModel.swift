import Foundation

struct LoginRequest: Codable {
    let email: String
    let password: String
}

struct LoginResponse: Codable {
    let token: String?
    let message: String?
}

@MainActor
class UserAuthViewModel: ObservableObject {
    @Published var email = ""
    @Published var password = ""
    @Published var token: String?
    @Published var isLoggedIn = false
    @Published var errorMessage = ""

    let baseURL = "http://192.168.1.37:3000"

    func login() {
        guard let url = URL(string: "\(baseURL)/login") else {
            errorMessage = "Invalid URL"
            return
        }

        let loginRequest = LoginRequest(email: email, password: password)

        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")

        do {
            request.httpBody = try JSONEncoder().encode(loginRequest)
        } catch {
            errorMessage = "Failed to encode login data."
            return
        }

        URLSession.shared.dataTask(with: request) { [weak self] data, response, error in
            guard let self = self else { return }

            if let error = error {
                DispatchQueue.main.async {
                    self.errorMessage = "Network error: \(error.localizedDescription)"
                }
                return
            }

            guard let data = data else {
                DispatchQueue.main.async {
                    self.errorMessage = "No data received from server."
                }
                return
            }

            do {
                let decoded = try JSONDecoder().decode(LoginResponse.self, from: data)

                if let token = decoded.token {
                    DispatchQueue.main.async {
                        self.token = token
                        self.isLoggedIn = true
                        self.errorMessage = ""
                    }
                } else {
                    DispatchQueue.main.async {
                        self.errorMessage = decoded.message ?? "Invalid credentials or no token received."
                    }
                }
            } catch {
                DispatchQueue.main.async {
                    self.errorMessage = "Failed to decode server response."
                }
            }

        }.resume()
    }

    /// Use this method for authorized requests in the future
    func authorizedRequest(to endpoint: String) -> URLRequest? {
        guard let token = token,
              let url = URL(string: "\(baseURL)\(endpoint)") else {
            errorMessage = "Unauthorized or invalid request URL."
            return nil
        }

        var request = URLRequest(url: url)
        request.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
        return request
    }
}

