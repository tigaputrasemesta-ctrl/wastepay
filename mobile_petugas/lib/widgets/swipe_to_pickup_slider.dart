import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import '../core/constants/app_colors.dart';

class SwipeToPickupSlider extends StatefulWidget {
  final Future<void> Function() onConfirmed;
  final String label;
  final String confirmedLabel;
  final IconData icon;
  final Color activeColor;
  final Color backgroundColor;
  final double height;
  final bool isMenunggak;

  const SwipeToPickupSlider({
    super.key,
    required this.onConfirmed,
    this.label = "Geser untuk Selesai Angkut",
    this.confirmedLabel = "Berhasil Diangkut! ✓",
    this.icon = Icons.local_shipping_rounded,
    this.activeColor = const Color(0xFF00AA13), // Gojek Bright Green
    this.backgroundColor = const Color(0xFF1E293B), // Slate 800
    this.height = 58.0,
    this.isMenunggak = false,
  });

  @override
  State<SwipeToPickupSlider> createState() => _SwipeToPickupSliderState();
}

class _SwipeToPickupSliderState extends State<SwipeToPickupSlider>
    with SingleTickerProviderStateMixin {
  double _dragPosition = 0.0;
  bool _isConfirmed = false;
  bool _isLoading = false;
  late AnimationController _resetController;
  late Animation<double> _resetAnimation;

  @override
  void initState() {
    super.initState();
    _resetController = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 250),
    );
  }

  @override
  void dispose() {
    _resetController.dispose();
    super.dispose();
  }

  void _onHorizontalDragUpdate(DragUpdateDetails details, double maxDrag) {
    if (_isConfirmed || _isLoading) return;
    setState(() {
      _dragPosition = (_dragPosition + details.delta.dx).clamp(0.0, maxDrag);
    });

    // Ringan getar saat mulai menggeser
    if (_dragPosition > 10 && _dragPosition < 25) {
      HapticFeedback.selectionClick();
    }
  }

  void _onHorizontalDragEnd(DragEndDetails details, double maxDrag) {
    if (_isConfirmed || _isLoading) return;

    // Threshold konfirmasi: 80% dari lebar slider
    if (_dragPosition >= maxDrag * 0.78) {
      _completeConfirmation(maxDrag);
    } else {
      // Snap back ke awal dengan pegas
      _resetAnimation = Tween<double>(
        begin: _dragPosition,
        end: 0.0,
      ).animate(CurvedAnimation(
        parent: _resetController,
        curve: Curves.easeOutBack,
      ))..addListener(() {
          setState(() {
            _dragPosition = _resetAnimation.value;
          });
        });

      _resetController.forward(from: 0.0);
    }
  }

  Future<void> _completeConfirmation(double maxDrag) async {
    setState(() {
      _dragPosition = maxDrag;
      _isLoading = true;
    });

    // Haptic getar mantap untuk supir
    HapticFeedback.heavyImpact();

    try {
      await widget.onConfirmed();
      if (mounted) {
        setState(() {
          _isConfirmed = true;
          _isLoading = false;
        });
      }
    } catch (_) {
      if (mounted) {
        setState(() {
          _isLoading = false;
          _dragPosition = 0.0;
        });
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return LayoutBuilder(
      builder: (context, constraints) {
        final totalWidth = constraints.maxWidth;
        final thumbSize = widget.height - 8.0;
        final maxDrag = totalWidth - thumbSize - 8.0;

        final dragPercent = maxDrag > 0 ? (_dragPosition / maxDrag).clamp(0.0, 1.0) : 0.0;
        final sliderColor = widget.isMenunggak ? const Color(0xFFDC2626) : widget.activeColor;

        return Container(
          height: widget.height,
          width: totalWidth,
          decoration: BoxDecoration(
            color: widget.backgroundColor,
            borderRadius: BorderRadius.circular(widget.height / 2),
            border: Border.all(
              color: sliderColor.withValues(alpha: 0.35 + (0.5 * dragPercent)),
              width: 1.5,
            ),
            boxShadow: [
              BoxShadow(
                color: sliderColor.withValues(alpha: 0.25 * dragPercent),
                blurRadius: 12,
                offset: const Offset(0, 4),
              ),
            ],
          ),
          child: Stack(
            alignment: Alignment.centerLeft,
            children: [
              // 1. Expanding Trail Fill (Warna yang terisi saat digeser)
              Container(
                width: _dragPosition + thumbSize + 8.0,
                height: widget.height,
                decoration: BoxDecoration(
                  gradient: LinearGradient(
                    colors: [
                      sliderColor.withValues(alpha: 0.85),
                      sliderColor,
                    ],
                  ),
                  borderRadius: BorderRadius.circular(widget.height / 2),
                ),
              ),

              // 2. Text Label di Tengah (Shimmering effect / fade out saat digeser)
              Center(
                child: Opacity(
                  opacity: (1.0 - (dragPercent * 1.5)).clamp(0.0, 1.0),
                  child: Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Text(
                        _isLoading
                            ? "Memproses..."
                            : (_isConfirmed ? widget.confirmedLabel : widget.label),
                        style: const TextStyle(
                          color: Colors.white,
                          fontSize: 14,
                          fontWeight: FontWeight.w800,
                          letterSpacing: 0.3,
                        ),
                      ),
                      const SizedBox(width: 8),
                      const Icon(
                        Icons.chevron_right_rounded,
                        color: Colors.white70,
                        size: 20,
                      ),
                      const Icon(
                        Icons.chevron_right_rounded,
                        color: Colors.white38,
                        size: 20,
                      ),
                    ],
                  ),
                ),
              ),

              // 3. Draggable Thumb (Knob Slider Ikon Truk)
              Positioned(
                left: 4.0 + _dragPosition,
                child: GestureDetector(
                  onHorizontalDragUpdate: (details) =>
                      _onHorizontalDragUpdate(details, maxDrag),
                  onHorizontalDragEnd: (details) =>
                      _onHorizontalDragEnd(details, maxDrag),
                  child: Container(
                    width: thumbSize,
                    height: thumbSize,
                    decoration: BoxDecoration(
                      shape: BoxShape.circle,
                      color: Colors.white,
                      boxShadow: [
                        BoxShadow(
                          color: Colors.black.withValues(alpha: 0.35),
                          blurRadius: 6,
                          offset: const Offset(0, 2),
                        ),
                      ],
                    ),
                    child: Center(
                      child: _isLoading
                          ? SizedBox(
                              width: 22,
                              height: 22,
                              child: CircularProgressIndicator(
                                strokeWidth: 2.5,
                                color: sliderColor,
                              ),
                            )
                          : (_isConfirmed
                              ? const Icon(
                                  Icons.check_rounded,
                                  color: Color(0xFF00AA13),
                                  size: 26,
                                )
                              : Icon(
                                  widget.icon,
                                  color: sliderColor,
                                  size: 24,
                                )),
                    ),
                  ),
                ),
              ),
            ],
          ),
        );
      },
    );
  }
}
