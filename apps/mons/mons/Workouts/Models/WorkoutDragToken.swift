import Foundation

enum WorkoutDragToken: Equatable {
    case workout(String)
    case set(workoutID: String, setID: String)

    var encoded: String {
        switch self {
        case .workout(let identifier):
            "workout|\(identifier)"
        case .set(let workoutID, let setID):
            "set|\(workoutID)|\(setID)"
        }
    }

    init?(encoded: String) {
        let components = encoded.split(separator: "|", omittingEmptySubsequences: false).map(String.init)

        switch components.first {
        case "workout" where components.count == 2:
            self = .workout(components[1])
        case "set" where components.count == 3:
            self = .set(workoutID: components[1], setID: components[2])
        default:
            return nil
        }
    }
}
