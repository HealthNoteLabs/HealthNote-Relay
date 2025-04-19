import SwiftUI
import CoreData

@main
struct RunstrApp: App {
    @StateObject private var permissionManager = PermissionManager()
    
    // Set up the Core Data environment
    let persistenceController = PersistenceController.shared
    
    // App lifecycle information
    @Environment(\.scenePhase) var scenePhase
    
    // State to track if onboarding is needed
    @AppStorage("hasCompletedOnboarding") private var hasCompletedOnboarding: Bool = false
    
    var body: some Scene {
        WindowGroup {
            if hasCompletedOnboarding {
                MainTabView()
                    .environment(\.managedObjectContext, persistenceController.container.viewContext)
                    .environmentObject(permissionManager)
                    .onChange(of: scenePhase) { newPhase in
                        handleScenePhaseChange(to: newPhase)
                    }
            } else {
                OnboardingView(isOnboardingCompleted: $hasCompletedOnboarding)
            }
        }
    }
    
    private func handleScenePhaseChange(to newPhase: ScenePhase) {
        switch newPhase {
        case .active:
            print("App became active")
        case .background:
            saveContext()
            print("App went to background")
        case .inactive:
            print("App became inactive")
        @unknown default:
            print("Unknown scene phase")
        }
    }
    
    private func saveContext() {
        let context = persistenceController.container.viewContext
        if context.hasChanges {
            do {
                try context.save()
            } catch {
                let nsError = error as NSError
                fatalError("Unresolved error saving context: \(nsError), \(nsError.userInfo)")
            }
        }
    }
}

struct MainTabView: View {
    @EnvironmentObject private var permissionManager: PermissionManager
    @State private var selectedTab = 0
    
    var body: some View {
        TabView(selection: $selectedTab) {
            NavigationView {
                RunView()
            }
            .tabItem {
                Label("Run", systemImage: "figure.run")
            }
            .tag(0)
            
            NavigationView {
                HistoryView()
            }
            .tabItem {
                Label("History", systemImage: "list.bullet")
            }
            .tag(1)
            
            NavigationView {
                StatsView()
            }
            .tabItem {
                Label("Stats", systemImage: "chart.bar")
            }
            .tag(2)
            
            NavigationView {
                SettingsView()
            }
            .tabItem {
                Label("Settings", systemImage: "gear")
            }
            .tag(3)
        }
        .onAppear {
            // Request permissions when app starts
            requestPermissions()
        }
    }
    
    private func requestPermissions() {
        // Request location permissions
        permissionManager.requestLocationPermission { success in
            if success {
                print("Location permission granted")
            } else {
                print("Location permission denied")
            }
        }
        
        // Request HealthKit permissions
        permissionManager.requestHealthPermission { success in
            if success {
                print("HealthKit permission granted")
            } else {
                print("HealthKit permission denied")
            }
        }
    }
}

// Placeholder view for onboarding
struct OnboardingView: View {
    @Binding var isOnboardingCompleted: Bool
    
    var body: some View {
        VStack(spacing: 20) {
            Text("Welcome to Runstr")
                .font(.largeTitle)
                .fontWeight(.bold)
            
            Text("Track your runs with precision")
                .font(.title2)
            
            Spacer()
            
            Image(systemName: "figure.run")
                .font(.system(size: 100))
                .foregroundColor(.blue)
            
            Spacer()
            
            Button("Get Started") {
                isOnboardingCompleted = true
            }
            .font(.headline)
            .foregroundColor(.white)
            .padding()
            .frame(maxWidth: .infinity)
            .background(Color.blue)
            .cornerRadius(10)
            .padding(.horizontal)
        }
        .padding()
    }
} 