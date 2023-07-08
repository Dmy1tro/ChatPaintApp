using Chat.Api.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.SignalR;

namespace Chat.Api.Hubs
{
    [Authorize]
    public class ChatHub : Hub<IChatHubEvents>, IChatHubRequests
    {
        private readonly ChatManager _chatManager;
        private readonly PaintManager _paintManager;
        private readonly IHubContext<PaintHub> _paintHubContext;
        private readonly UserProvider _userProvider;

        public ChatHub(UserProvider userProvider,
                       ChatManager chatManager,
                       PaintManager paintManager,
                       IHubContext<PaintHub> hubContext,
                       ILogger<ChatHub> logger)
        {
            logger.LogInformation("ChatHub working...");
            _userProvider = userProvider;
            _chatManager = chatManager;
            _paintManager = paintManager;
            _paintHubContext = hubContext;
        }

        public async Task GetRoomsRequest()
        {
            await Clients.Caller.GetRoomsResponseEvent(_chatManager.GetRooms());
            await Clients.Caller.SuccessEvent(nameof(GetRoomsRequest));
        }

        public async Task CreateRoomRequest(string room)
        {
            var isSuccess = _chatManager.CreateRoom(room);

            if (!isSuccess)
            {
                await Clients.Caller.FailedEvent(nameof(CreateRoomRequest), $"Cannot create room with name '{room}'");
                return;
            }

            await Clients.All.RoomCreatedEvent(room);
            await Clients.Caller.SuccessEvent(nameof(CreateRoomRequest));
        }

        public async Task JoinRoomRequest(string room, string userName)
        {
            var userId = _userProvider.GetUserId();
            var isSuccess = _chatManager.JoinRoom(room, Context.ConnectionId, userId, userName);

            if (!isSuccess)
            {
                await Clients.Caller.FailedEvent(nameof(JoinRoomRequest), $"Cannot join room '{room}' with userName '{userName}'");
                return;
            }

            await Groups.AddToGroupAsync(Context.ConnectionId, room);
            await Clients.Group(room).JoinedRoomEvent(userName);
            await Clients.Caller.SuccessEvent(nameof(JoinRoomRequest));
        }

        public async Task LeaveRoomRequest(string room)
        {
            var userId = _userProvider.GetUserId();

            if (!_chatManager.IsUserInRoom(room, userId))
            {
                await Clients.Caller.FailedEvent(nameof(LeaveRoomRequest), $"User is not in room '{room}'");
                return;
            }

            var userName = _chatManager.GetUserNameInRoom(room, userId);
            _chatManager.LeaveRoom(room, userId);

            await Groups.RemoveFromGroupAsync(Context.ConnectionId, room);
            await Clients.Group(room).LeavedRoomEvent(userName);
            await Clients.Caller.SuccessEvent(nameof(LeaveRoomRequest));
        }

        public async Task GetMessagesRequest(string room)
        {
            var userId = _userProvider.GetUserId();

            if (!_chatManager.IsUserInRoom(room, userId))
            {
                await Clients.Caller.FailedEvent(nameof(GetMessagesRequest), $"User is not in room '{room}'");
                return;
            }

            var messages = _chatManager.GetMessages(room, userId);

            await Clients.Caller.GetMessagesResponseEvent(messages);
            await Clients.Caller.SuccessEvent(nameof(GetMessagesRequest));
        }

        public async Task SendMessageRequest(string room, string text)
        {
            var userId = _userProvider.GetUserId();

            if (!_chatManager.IsUserInRoom(room, userId))
            {
                await Clients.Caller.FailedEvent(nameof(SendMessageRequest), $"User is not in room '{room}'");
                return;
            }

            var message = _chatManager.SendMessage(room, userId, text);

            await Clients.Group(room).ReceivedMessageEvent(message);
            await Clients.Caller.SuccessEvent(nameof(SendMessageRequest));
        }

        public async Task GetParticipantsRequest(string room)
        {
            var userId = _userProvider.GetUserId();

            if (!_chatManager.IsUserInRoom(room, userId))
            {
                await Clients.Caller.FailedEvent(nameof(GetParticipantsRequest), $"User is not in room '{room}'");
                return;
            }

            var participants = _chatManager.GetParticipants(room, userId);

            await Clients.Caller.GetParticipantsResponseEvent(participants);
            await Clients.Caller.SuccessEvent(nameof(GetParticipantsRequest));
        }

        public override async Task OnDisconnectedAsync(Exception? exception)
        {
            await base.OnDisconnectedAsync(exception);
            
            var userId = _userProvider.GetUserId();
            var roomNames = _chatManager.GetUserRoomsByConnectionId(Context.ConnectionId);

            foreach (var room in roomNames)
            {
                var userName = _chatManager.GetUserNameInRoom(room, userId);
                _chatManager.DisconnectUserFromRoom(room, userId);

                await Groups.RemoveFromGroupAsync(Context.ConnectionId, room);
                await Clients.Group(room).LeavedRoomEvent(userName);
            }
        }
    }

    public interface IChatHubRequests
    {
        Task GetRoomsRequest();
        Task CreateRoomRequest(string room);
        Task JoinRoomRequest(string room, string userName);
        Task LeaveRoomRequest(string room);
        Task GetMessagesRequest(string room);
        Task SendMessageRequest(string room, string text);
        Task GetParticipantsRequest(string room);
    }

    public interface IChatHubEvents
    {
        Task RoomCreatedEvent(string roomName);
        Task JoinedRoomEvent(string userName);
        Task LeavedRoomEvent(string userName);
        Task ReceivedMessageEvent(Message message);
        Task GetMessagesResponseEvent(IReadOnlyCollection<Message> messages);
        Task GetRoomsResponseEvent(List<string> rooms);
        Task GetParticipantsResponseEvent(List<string> participants);
        Task FailedEvent(string operation, string errorMessage);
        Task SuccessEvent(string operation);
    }
}
