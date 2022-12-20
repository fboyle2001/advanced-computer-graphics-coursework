from dataclasses import dataclass

@dataclass
class Vector2:
    x: float
    y: float

    def __add__(self, p):
        return Vector2(self.x + p.x, self.y + p.y)

    def __sub__(self, p):
        return Vector2(self.x - p.x, self.y - p.y)

    def scale(self, p):
        return Vector2(self.x * p, self.y * p)

    def __str__(self):
        return f"{(self.x, self.y)}"

@dataclass
class Vector3:
    x: float
    y: float
    z: float

    def __add__(self, p):
        return Vector3(self.x + p.x, self.y + p.y, self.z + p.z)

    def __sub__(self, p):
        return Vector3(self.x - p.x, self.y - p.y, self.z - p.z)

    def scale(self, p):
        return Vector3(self.x * p, self.y * p, self.z * p)

    def __str__(self):
        return f"{(self.x, self.y, self.z)}"