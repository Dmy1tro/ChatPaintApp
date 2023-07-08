using System.Collections.Concurrent;

namespace Chat.Api.Services
{
    public class PaintManager
    {
        private static readonly ConcurrentDictionary<string, List<DrawModel>> _drawedLines = new();

        public void AddDrawing(string room, DrawModel model)
        {
            if (!_drawedLines.ContainsKey(room))
            {
                _drawedLines[room] = new List<DrawModel>();
            }

            _drawedLines[room].Add(model);
        }

        public void ClearDrawing(string room)
        {
            _drawedLines[room] = new List<DrawModel>();
        }

        public IReadOnlyCollection<DrawModel> GetAllDrawing(string room)
        {
            if (!_drawedLines.ContainsKey(room))
            {
                return new List<DrawModel>();
            }

            return _drawedLines[room].AsReadOnly();
        }
    }

    public class DrawModel
    {
        public string Status { get; set; } // Start, InProccess, Finish

        public string Color { get; set; }

        public float X { get; set; }

        public float Y { get; set; }

        public DateTime CreatedDate { get; set; }
    }
}
