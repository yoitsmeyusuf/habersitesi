using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace habersitesi_backend.Migrations
{
    /// <inheritdoc />
    public partial class AddPerformanceIndexes : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            // News tablosuna performans indeksleri
            migrationBuilder.CreateIndex(
                name: "IX_News_Date",
                table: "News",
                column: "Date");

            migrationBuilder.CreateIndex(
                name: "IX_News_Category",
                table: "News",
                column: "Category");

            migrationBuilder.CreateIndex(
                name: "IX_News_Featured",
                table: "News",
                column: "Featured");

            migrationBuilder.CreateIndex(
                name: "IX_News_Featured_Date",
                table: "News",
                columns: new[] { "Featured", "Date" });

            // Comments tablosuna indeks
            migrationBuilder.CreateIndex(
                name: "IX_Comments_Approved",
                table: "Comments",
                column: "Approved");

            migrationBuilder.CreateIndex(
                name: "IX_Comments_NewsId_Approved",
                table: "News",
                columns: new[] { "NewsId", "Approved" });

            // Categories tablosuna indeks
            migrationBuilder.CreateIndex(
                name: "IX_Categories_Name",
                table: "Categories",
                column: "Name",
                unique: true);

            // Full-text search için title indeksi
            migrationBuilder.CreateIndex(
                name: "IX_News_Title",
                table: "News",
                column: "Title");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_News_Date",
                table: "News");

            migrationBuilder.DropIndex(
                name: "IX_News_Category", 
                table: "News");

            migrationBuilder.DropIndex(
                name: "IX_News_Featured",
                table: "News");

            migrationBuilder.DropIndex(
                name: "IX_News_Featured_Date",
                table: "News");

            migrationBuilder.DropIndex(
                name: "IX_Comments_Approved",
                table: "Comments");

            migrationBuilder.DropIndex(
                name: "IX_Comments_NewsId_Approved",
                table: "Comments");

            migrationBuilder.DropIndex(
                name: "IX_Categories_Name",
                table: "Categories");

            migrationBuilder.DropIndex(
                name: "IX_News_Title",
                table: "News");
        }
    }
}
