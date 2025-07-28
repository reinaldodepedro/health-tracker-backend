import SwiftUI

// Renamed to avoid ambiguity
struct DailyHealthEntry: Codable {
    let sleepHours: Int
    let waterIntake: Int
    let mood: String
}

struct ContentView: View {
    @EnvironmentObject var auth: UserAuthViewModel

    @State private var sleepHours = ""
    @State private var waterIntake = ""
    @State private var mood = ""

    @State private var submissionMessage = ""

    var body: some View {
        NavigationView {
            Form {
                Section(header: Text("Daily Health Info")) {
                    TextField("Sleep Hours", text: $sleepHours)
                        .keyboardType(.numberPad)
                    TextField("Water Intake (cups)", text: $waterIntake)
                        .keyboardType(.numberPad)
                    TextField("Mood", text: $mood)
                }
                
                Button(action: submitData) {
                    Text("Submit")
                        .frame(maxWidth: .infinity, alignment: .center)
                }
                
                if !submissionMessage.isEmpty {
                    Text(submissionMessage)
                        .foregroundColor(.blue)
                        .padding(.top)
                }
            }
            .navigationTitle("Health Tracker")
        }
    }

    func submitData() {
        guard let sleep = Int(sleepHours),
              let water = Int(waterIntake),
              !mood.isEmpty else {
            submissionMessage = "Please fill in all fields correctly."
            return
        }

        guard auth.isLoggedIn, let token = auth.token else {
            submissionMessage = "You must be logged in to submit data."
            return
        }

        let entry = DailyHealthEntry(sleepHours: sleep, waterIntake: water, mood: mood)
        sendHealthData(entry, token: token)
    }

    func sendHealthData(_ entry: DailyHealthEntry, token: String) {
        guard let url = URL(string: "\(auth.baseURL)/submit") else {
            submissionMessage = "Invalid URL"
            return
        }

        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        request.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")

        do {
            let jsonData = try JSONEncoder().encode(entry)
            request.httpBody = jsonData
        } catch {
            submissionMessage = "Error encoding data: \(error.localizedDescription)"
            return
        }

        URLSession.shared.dataTask(with: request) { data, response, error in
            DispatchQueue.main.async {
                if let error = error {
                    submissionMessage = "Error sending data: \(error.localizedDescription)"
                    return
                }

                if let httpResponse = response as? HTTPURLResponse {
                    if httpResponse.statusCode == 200 {
                        submissionMessage = "Data submitted successfully!"
                        sleepHours = ""
                        waterIntake = ""
                        mood = ""
                    } else {
                        submissionMessage = "Server error: \(httpResponse.statusCode)"
                    }
                } else {
                    submissionMessage = "Unknown server response."
                }
            }
        }.resume()
    }
}

struct ContentView_Previews: PreviewProvider {
    static var previews: some View {
        ContentView()
            .environmentObject(UserAuthViewModel())
    }
}

