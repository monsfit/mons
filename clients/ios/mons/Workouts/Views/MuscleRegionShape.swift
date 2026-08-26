import SwiftUI

struct MuscleRegionShape: Shape {
    let commands: [[Double]]

    func path(in rect: CGRect) -> Path {
        Path { path in
            for command in commands {
                guard let operation = command.first.map(Int.init) else { continue }

                switch operation {
                case 0 where command.count == 3:
                    path.move(to: point(x: command[1], y: command[2], in: rect))
                case 1 where command.count == 3:
                    path.addLine(to: point(x: command[1], y: command[2], in: rect))
                case 2 where command.count == 7:
                    path.addCurve(
                        to: point(x: command[5], y: command[6], in: rect),
                        control1: point(x: command[1], y: command[2], in: rect),
                        control2: point(x: command[3], y: command[4], in: rect)
                    )
                case 3:
                    path.closeSubpath()
                default:
                    continue
                }
            }
        }
    }

    private func point(x: Double, y: Double, in rect: CGRect) -> CGPoint {
        CGPoint(
            x: rect.minX + rect.width * x,
            y: rect.minY + rect.height * y
        )
    }
}
