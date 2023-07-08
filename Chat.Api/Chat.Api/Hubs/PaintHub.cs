using Chat.Api.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.SignalR;

namespace Chat.Api.Hubs
{
    [Authorize]
    public class PaintHub : Hub<IPaintHubEvents>, IPaintHubRequests
    {
        private readonly UserProvider _userProvider;
        private readonly ChatManager _chatManager;
        private readonly PaintManager _paintManager;
        private readonly ILogger<PaintHub> _logger;

        public PaintHub(UserProvider userProvider,
                        ChatManager chatManager,
                        PaintManager paintManager,
                        ILogger<PaintHub> logger)
        {
            logger.LogInformation("PaintHub working...");
            _userProvider = userProvider;
            _chatManager = chatManager;
            _paintManager = paintManager;
            _logger = logger;
        }

        // Need to duplicate because 'Groups' in ChatHub and 'Groups' in PaintHub are completly different.
        public async Task JoinPaintRoomRequest(string room)
        {
            var userId = _userProvider.GetUserId();

            if (!_chatManager.IsUserInRoom(room, userId))
            {
                await Clients.Caller.FailedEvent(nameof(JoinPaintRoomRequest), $"User is not in room '{room}'");
                return;
            }

            await Groups.AddToGroupAsync(Context.ConnectionId, room);
            await Clients.Caller.SuccessEvent(nameof(JoinPaintRoomRequest));
        }

        public async Task ClearCanvasRequest(string room)
        {
            var userId = _userProvider.GetUserId();

            if (!_chatManager.IsUserInRoom(room, userId))
            {
                await Clients.Caller.FailedEvent(nameof(ClearCanvasRequest), $"User is not in the room '{room}'");
                return;
            }

            _paintManager.ClearDrawing(room);

            await Clients.OthersInGroup(room).CanvasClearedEvent();
            await Clients.Caller.SuccessEvent(nameof(ClearCanvasRequest));
        }

        public async Task DrawRequest(string room, DrawModel model)
        {
            var userId = _userProvider.GetUserId();

            if (!_chatManager.IsUserInRoom(room, userId))
            {
                await Clients.Caller.FailedEvent(nameof(ClearCanvasRequest), $"User is not in the room '{room}'");
                return;
            }

            _paintManager.AddDrawing(room, model);

            await Clients.OthersInGroup(room).DrawEvent(model);
            await Clients.Caller.SuccessEvent(nameof(DrawRequest));
        }

        public async Task GetRoomDrawingRequest(string room)
        {
            var userId = _userProvider.GetUserId();

            if (!_chatManager.IsUserInRoom(room, userId))
            {
                await Clients.Caller.FailedEvent(nameof(ClearCanvasRequest), $"User is not in the room '{room}'");
                return;
            }

            var allDrawing = _paintManager.GetAllDrawing(room);

            await Clients.Caller.GetAllDrawingEvent(allDrawing);
            await Clients.Caller.SuccessEvent(nameof(GetRoomDrawingRequest));
        }

        public override async Task OnDisconnectedAsync(Exception? exception)
        {
            await base.OnDisconnectedAsync(exception);

            var roomNames = _chatManager.GetUserRoomsByConnectionId(Context.ConnectionId);

            foreach (var room in roomNames)
            {
                await Groups.RemoveFromGroupAsync(Context.ConnectionId, room);
            }
        }
    }

    public interface IPaintHubRequests
    {
        Task JoinPaintRoomRequest(string room);
        Task ClearCanvasRequest(string room);
        Task DrawRequest(string room, DrawModel model);
        Task GetRoomDrawingRequest(string room);
    }

    public interface IPaintHubEvents
    {
        Task CanvasClearedEvent();
        Task DrawEvent(DrawModel model);
        Task GetAllDrawingEvent(IReadOnlyCollection<DrawModel> models);
        Task FailedEvent(string operation, string errorMessage);
        Task SuccessEvent(string operation);
    }
}
