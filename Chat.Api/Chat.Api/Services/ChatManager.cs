namespace Chat.Api.Services
{
    public class Room
    {
        public string Name { get; set; } = null!;

        public List<User> Users { get; set; } = new();

        public List<Message> Messages { get; set; } = new();

        public Message AddMessage(string userName, string text, DateTime createdDate)
        {
            var message = new Message { UserName = userName, Text = text, CreatedDate = createdDate };
            Messages.Add(message);

            return message;
        }

        public string GetUserName(string userId)
        {
            var user = Users.FirstOrDefault(u => u.UserId == userId);

            return user?.UserName;
        }

        public User AddUser(string connectionId, string userId, string userName)
        {
            var user = new User { UserId = userId, UserName = userName, ConnectionId = connectionId };
            Users.Add(user);

            return user;
        }

        public void RemoveUser(string userId)
        {
            var user = Users.FirstOrDefault(u => u.UserId == userId);

            if (user is not null)
            {
                Users.Remove(user);
            }
        }

        public void RemoveUserWithConnectionId(string connectionId)
        {
            var user = Users.FirstOrDefault(u => u.ConnectionId == connectionId);

            if (user is not null)
            {
                Users.Remove(user);
            }
        }

        public bool HasUser(string userId)
        {
            return Users.Any(u => u.UserId == userId);
        }

        public bool HasUserWithConnectionId(string connectionId)
        {
            return Users.Any(u => u.ConnectionId == connectionId);
        }

        public bool HasUserWithName(string userName)
        {
            return Users.Any(u => u.UserName == userName);
        }
    }

    public class Message
    {
        public string UserName { get; set; }

        public string Text { get; set; }

        public DateTime CreatedDate { get; set; }
    }

    public class User
    {
        public string UserId { get; set; }

        // The same user can connect to different rooms using different connections.
        // But there is could be ONE connection and ONE userId per ONE room.
        public string ConnectionId { get; set; }

        public string UserName { get; set; }
    }

    public class ChatManager
    {
        private static readonly List<Room> _rooms = new();

        public bool CreateRoom(string name)
        {
            if (_rooms.Any(r => r.Name == name))
            {
                return false;
            }

            _rooms.Add(new Room { Name = name });

            return true;
        }

        public List<string> GetRooms()
        {
            return _rooms.Select(r => r.Name).ToList();
        }

        public bool JoinRoom(string roomName, string connectionId, string userId, string userName)
        {
            var room = _rooms.FirstOrDefault(r => r.Name == roomName);

            if (room is null || 
                string.IsNullOrWhiteSpace(userName) || 
                room.HasUser(userId) ||
                room.HasUserWithName(userName))
            {
                return false;
            }

            room.AddUser(connectionId, userId, userName);

            return true;
        }

        public bool LeaveRoom(string roomName, string userId)
        {
            var room = _rooms.FirstOrDefault(r => r.Name == roomName);

            if (room is null || !room.HasUser(userId))
            {
                return false;
            }

            room.RemoveUser(userId);

            return true;
        }

        public Message SendMessage(string roomName, string userId, string text)
        {
            var room = _rooms.FirstOrDefault(r => r.Name == roomName);

            if (room is null || !room.HasUser(userId) || string.IsNullOrWhiteSpace(text))
            {
                return null;
            }

            var userName = room.GetUserName(userId);
            var message = room.AddMessage(userName, text, DateTime.UtcNow);

            return message;
        }

        public IReadOnlyCollection<Message> GetMessages(string roomName, string userId)
        {
            var room = _rooms.FirstOrDefault(r => r.Name == roomName);

            if (room is null || !room.HasUser(userId))
            {
                return new List<Message>();
            }

            return room.Messages.AsReadOnly();
        }

        public List<string> GetParticipants(string roomName, string userId)
        {
            var room = _rooms.FirstOrDefault(r => r.Name == roomName);

            if (room is null || !room.HasUser(userId))
            {
                return new List<string>();
            }

            return room.Users.Select(u => u.UserName).ToList();
        }

        public string GetUserNameInRoom(string roomName, string userId)
        {
            var room = _rooms.FirstOrDefault(r => r.Name == roomName && r.HasUser(userId));

            if (room is null)
            {
                return null;
            }

            return room.GetUserName(userId);
        }

        public bool IsUserInRoom(string roomName, string userId)
        {
            return _rooms.Any(r => r.Name == roomName && r.HasUser(userId));
        }

        public IReadOnlyCollection<string> GetUserRooms(string userId)
        {
            var rooms = _rooms.Where(r => r.HasUser(userId)).Select(r => r.Name).ToList();

            return rooms.AsReadOnly();
        }

        public IReadOnlyCollection<string> GetUserRoomsByConnectionId(string connectionId)
        {
            var rooms = _rooms.Where(r => r.HasUserWithConnectionId(connectionId)).Select(r => r.Name).ToList();

            return rooms.AsReadOnly();
        }

        public void DisconnectUserFromRoom(string roomName, string userId)
        {
            var room = _rooms.FirstOrDefault(r => r.Name == roomName);
            room?.RemoveUser(userId);
        }
    }
}
